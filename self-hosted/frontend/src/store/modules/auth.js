import api from '@/utils/api'

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: false
}

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  user: state => state.user,
  userRole: state => state.user?.role || state.user?.type || null,
  isAdmin: state => state.user?.role === 'admin'
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
    state.isAuthenticated = !!token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  },
  
  SET_USER(state, user) {
    state.user = user
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  },
  
  LOGOUT(state) {
    state.token = null
    state.user = null
    state.isAuthenticated = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

const actions = {
  async login({ commit }, { username, password, type }) {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
        type
      })
      
      const { token, user } = response.data
      
      commit('SET_TOKEN', token)
      commit('SET_USER', user)
      
      // 设置API默认token
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '登录失败'
      }
    }
  },
  
  async verifyToken({ commit }, token) {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      const response = await api.post('/auth/verify')
      const { user } = response.data
      
      commit('SET_TOKEN', token)
      commit('SET_USER', user)
      
      return true
    } catch (error) {
      commit('LOGOUT')
      delete api.defaults.headers.common['Authorization']
      throw error
    }
  },
  
  logout({ commit }) {
    commit('LOGOUT')
    delete api.defaults.headers.common['Authorization']
  },
  
  async changePassword(context, { oldPassword, newPassword }) {
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '修改密码失败'
      }
    }
  }
}

// 初始化token
if (state.token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
  state.isAuthenticated = true
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
