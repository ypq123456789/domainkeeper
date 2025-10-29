import api from '@/utils/api'

const state = {
  domains: [],
  loading: false,
  stats: null
}

const getters = {
  domains: state => state.domains,
  loading: state => state.loading,
  stats: state => state.stats,
  
  // 分类域名
  categorizedDomains: state => {
    const cfTopLevel = []
    const cfSecondLevelAndCustom = []
    
    state.domains.forEach(domain => {
      if (domain.system === 'Cloudflare' && domain.domain.split('.').length === 2) {
        cfTopLevel.push(domain)
      } else {
        cfSecondLevelAndCustom.push(domain)
      }
    })
    
    return {
      cfTopLevel: cfTopLevel.sort((a, b) => a.domain.localeCompare(b.domain)),
      cfSecondLevelAndCustom: cfSecondLevelAndCustom.sort((a, b) => a.domain.localeCompare(b.domain))
    }
  },
  
  // 统计信息
  domainStats: state => {
    const total = state.domains.length
    const expired = state.domains.filter(d => d.daysRemaining <= 0).length
    const expiring = state.domains.filter(d => d.daysRemaining > 0 && d.daysRemaining <= 30).length
    const normal = total - expired - expiring
    
    return {
      total,
      expired,
      expiring,
      normal
    }
  }
}

const mutations = {
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  
  SET_DOMAINS(state, domains) {
    state.domains = domains
  },
  
  SET_STATS(state, stats) {
    state.stats = stats
  },
  
  ADD_DOMAIN(state, domain) {
    state.domains.push(domain)
  },
  
  UPDATE_DOMAIN(state, updatedDomain) {
    const index = state.domains.findIndex(d => d.id === updatedDomain.id)
    if (index !== -1) {
      state.domains.splice(index, 1, updatedDomain)
    }
  },
  
  REMOVE_DOMAIN(state, domainId) {
    const index = state.domains.findIndex(d => d.id === domainId)
    if (index !== -1) {
      state.domains.splice(index, 1)
    }
  }
}

const actions = {
  async fetchDomains({ commit }) {
    commit('SET_LOADING', true)
    try {
      const domainsResponse = await api.get('/domains')
      commit('SET_DOMAINS', domainsResponse.data.domains)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '获取域名列表失败'
      }
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async fetchStats({ commit }) {
    try {
      const response = await api.get('/domains/stats/overview')
      commit('SET_STATS', response.data.stats)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '获取统计信息失败'
      }
    }
  },
  
  async addDomain({ commit }, domainData) {
    try {
      await api.post('/domains', domainData)
      // 重新获取域名列表
      const domainsResponse = await api.get('/domains')
      commit('SET_DOMAINS', domainsResponse.data.domains)
      return { success: true, message: '域名添加成功' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '添加域名失败'
      }
    }
  },
  
  async updateDomain({ commit }, { id, domainData }) {
    try {
      await api.put(`/domains/${id}`, domainData)
      // 重新获取域名列表
      const domainsResponse = await api.get('/domains')
      commit('SET_DOMAINS', domainsResponse.data.domains)
      return { success: true, message: '域名更新成功' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '更新域名失败'
      }
    }
  },
  
  async deleteDomain({ commit }, domainId) {
    try {
      await api.delete(`/domains/${domainId}`)
      commit('REMOVE_DOMAIN', domainId)
      return { success: true, message: '域名删除成功' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '删除域名失败'
      }
    }
  },
  
  async syncCloudflare({ commit }) {
    try {
      const response = await api.post('/domains/sync-cloudflare')
      // 重新获取域名列表
      const domainsResponse = await api.get('/domains')
      commit('SET_DOMAINS', domainsResponse.data.domains)
      return {
        success: true,
        message: response.data.message,
        stats: response.data.stats
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '同步Cloudflare失败'
      }
    }
  },
  
  async updateWhois({ commit }, domain) {
    try {
      await api.post(`/domains/${domain}/whois`)
      // 重新获取域名列表
      const domainsResponse = await api.get('/domains')
      commit('SET_DOMAINS', domainsResponse.data.domains)
      return {
        success: true,
        message: 'WHOIS信息更新成功'
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'WHOIS更新失败'
      }
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
