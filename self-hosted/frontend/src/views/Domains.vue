<template>
  <div class="page-container">
    <!-- 头部 -->
    <div class="header-section">
      <div class="header-content">
        <div class="logo-section">
          <h1>DomainKeeper</h1>
          <p>域名管理系统</p>
        </div>
        
        <div class="user-section">
          <el-dropdown @command="handleUserCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userRole === 'admin' ? '管理员' : '访客' }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isAdmin" command="admin">管理后台</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新数据</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="main-content">
      <!-- 统计卡片 -->
      <div class="stats-section" v-if="domainStats">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-number">{{ domainStats.total }}</div>
              <div class="stat-label">总域名</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card normal">
              <div class="stat-number">{{ domainStats.normal }}</div>
              <div class="stat-label">正常</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card warning">
              <div class="stat-number">{{ domainStats.expiring }}</div>
              <div class="stat-label">即将过期</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card danger">
              <div class="stat-number">{{ domainStats.expired }}</div>
              <div class="stat-label">已过期</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 域名列表 -->
      <div class="domains-section">
        <!-- CF顶级域名 -->
        <div class="section-card" v-if="categorizedDomains.cfTopLevel.length > 0">
          <div class="section-header">
            <h3>Cloudflare 顶级域名 ({{ categorizedDomains.cfTopLevel.length }})</h3>
          </div>
          
          <div class="table-container">
            <el-table
              :data="categorizedDomains.cfTopLevel"
              stripe
              v-loading="loading"
              class="domains-table"
              :default-sort="{ prop: 'domain', order: 'ascending' }"
            >
              <el-table-column label="状态" width="60" align="center">
                <template #default="scope">
                  <div 
                    :class="['status-dot', getStatusClass(scope.row.daysRemaining)]"
                    :title="getStatusText(scope.row.daysRemaining)"
                  ></div>
                </template>
              </el-table-column>
              
              <el-table-column prop="domain" label="域名" sortable min-width="150">
                <template #default="scope">
                  <el-text class="domain-name" @click="copyDomain(scope.row.domain)">
                    {{ scope.row.domain }}
                  </el-text>
                </template>
              </el-table-column>
              
              <el-table-column prop="system" label="系统" width="100" class-name="hidden-sm-and-down" />
              <el-table-column prop="registrar" label="注册商" width="120" class-name="hidden-sm-and-down" />
              <el-table-column prop="registrationDate" label="注册日期" width="110" class-name="hidden-sm-and-down">
                <template #default="scope">
                  {{ formatDate(scope.row.registrationDate) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="expirationDate" label="到期日期" width="110" sortable>
                <template #default="scope">
                  {{ formatDate(scope.row.expirationDate) }}
                </template>
              </el-table-column>
              
              <el-table-column label="剩余天数" width="90" sortable :sort-method="sortByDaysRemaining">
                <template #default="scope">
                  <el-text :type="getDaysRemainingType(scope.row.daysRemaining)">
                    {{ scope.row.daysRemaining === 'N/A' ? 'N/A' : scope.row.daysRemaining + '天' }}
                  </el-text>
                </template>
              </el-table-column>
              
              <el-table-column label="使用进度" width="120" class-name="hidden-sm-and-down">
                <template #default="scope">
                  <div class="progress-container">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: scope.row.progressPercentage + '%' }"
                      ></div>
                    </div>
                    <el-text class="progress-text">{{ Math.round(scope.row.progressPercentage) }}%</el-text>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- CF二级域名和自定义域名 -->
        <div class="section-card" v-if="categorizedDomains.cfSecondLevelAndCustom.length > 0">
          <div class="section-header">
            <h3>二级域名 & 自定义域名 ({{ categorizedDomains.cfSecondLevelAndCustom.length }})</h3>
          </div>
          
          <div class="table-container">
            <el-table
              :data="categorizedDomains.cfSecondLevelAndCustom"
              stripe
              v-loading="loading"
              class="domains-table"
              :default-sort="{ prop: 'domain', order: 'ascending' }"
            >
              <el-table-column label="状态" width="60" align="center">
                <template #default="scope">
                  <div 
                    :class="['status-dot', getStatusClass(scope.row.daysRemaining)]"
                    :title="getStatusText(scope.row.daysRemaining)"
                  ></div>
                </template>
              </el-table-column>
              
              <el-table-column prop="domain" label="域名" sortable min-width="150">
                <template #default="scope">
                  <el-text class="domain-name" @click="copyDomain(scope.row.domain)">
                    {{ scope.row.domain }}
                    <el-tag v-if="scope.row.isCustom" size="small" type="info" class="custom-tag">自定义</el-tag>
                  </el-text>
                </template>
              </el-table-column>
              
              <el-table-column prop="system" label="系统" width="100" class-name="hidden-sm-and-down" />
              <el-table-column prop="registrar" label="注册商" width="120" class-name="hidden-sm-and-down" />
              <el-table-column prop="registrationDate" label="注册日期" width="110" class-name="hidden-sm-and-down">
                <template #default="scope">
                  {{ formatDate(scope.row.registrationDate) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="expirationDate" label="到期日期" width="110" sortable>
                <template #default="scope">
                  {{ formatDate(scope.row.expirationDate) }}
                </template>
              </el-table-column>
              
              <el-table-column label="剩余天数" width="90" sortable :sort-method="sortByDaysRemaining">
                <template #default="scope">
                  <el-text :type="getDaysRemainingType(scope.row.daysRemaining)">
                    {{ scope.row.daysRemaining === 'N/A' ? 'N/A' : scope.row.daysRemaining + '天' }}
                  </el-text>
                </template>
              </el-table-column>
              
              <el-table-column label="使用进度" width="120" class-name="hidden-sm-and-down">
                <template #default="scope">
                  <div class="progress-container">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: scope.row.progressPercentage + '%' }"
                      ></div>
                    </div>
                    <el-text class="progress-text">{{ Math.round(scope.row.progressPercentage) }}%</el-text>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && categorizedDomains.cfTopLevel.length === 0 && categorizedDomains.cfSecondLevelAndCustom.length === 0" class="empty-state">
          <el-empty description="暂无域名数据">
            <el-button type="primary" @click="refreshData">刷新数据</el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, ArrowDown } from '@element-plus/icons-vue'
import { formatDate, getStatusText, copyToClipboard } from '@/utils/helpers'

export default {
  name: 'Domains',
  components: {
    User,
    ArrowDown
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const loading = computed(() => store.getters['domains/loading'])
    const domains = computed(() => store.getters['domains/domains'])
    const categorizedDomains = computed(() => store.getters['domains/categorizedDomains'])
    const domainStats = computed(() => store.getters['domains/domainStats'])
    const userRole = computed(() => store.getters['auth/userRole'])
    const isAdmin = computed(() => store.getters['auth/isAdmin'])
    
    const refreshData = async () => {
      const result = await store.dispatch('domains/fetchDomains')
      if (!result.success) {
        ElMessage.error(result.message)
      }
    }
    
    const handleUserCommand = (command) => {
      switch (command) {
        case 'admin':
          router.push('/admin')
          break
        case 'refresh':
          refreshData()
          break
        case 'logout':
          store.dispatch('auth/logout')
          router.push('/login')
          break
      }
    }
    
    const copyDomain = async (domain) => {
      try {
        await copyToClipboard(domain)
        ElMessage.success('域名已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败')
      }
    }
    
    const getStatusClass = (daysRemaining) => {
      if (daysRemaining === 'N/A' || daysRemaining < 0) return 'status-expired'
      if (daysRemaining <= 7) return 'status-danger'
      if (daysRemaining <= 30) return 'status-warning'
      return 'status-normal'
    }
    
    const getDaysRemainingType = (daysRemaining) => {
      if (daysRemaining === 'N/A' || daysRemaining < 0) return 'info'
      if (daysRemaining <= 7) return 'danger'
      if (daysRemaining <= 30) return 'warning'
      return 'success'
    }
    
    const sortByDaysRemaining = (a, b) => {
      const aDays = a.daysRemaining === 'N/A' ? -999 : a.daysRemaining
      const bDays = b.daysRemaining === 'N/A' ? -999 : b.daysRemaining
      return aDays - bDays
    }
    
    onMounted(() => {
      refreshData()
    })
    
    return {
      loading,
      domains,
      categorizedDomains,
      domainStats,
      userRole,
      isAdmin,
      refreshData,
      handleUserCommand,
      copyDomain,
      formatDate,
      getStatusClass,
      getStatusText,
      getDaysRemainingType,
      sortByDaysRemaining
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header-section {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section h1 {
  color: #409eff;
  font-size: 24px;
  margin-bottom: 4px;
}

.logo-section p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.user-section .user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.user-section .user-info:hover {
  background-color: #f5f5f5;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #409eff;
}

.stat-card.normal {
  border-left-color: #67c23a;
}

.stat-card.warning {
  border-left-color: #e6a23c;
}

.stat-card.danger {
  border-left-color: #f56c6c;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.domains-section .section-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.section-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.table-container {
  overflow-x: auto;
}

.domains-table {
  width: 100%;
}

.domain-name {
  cursor: pointer;
  color: #409eff;
  text-decoration: none;
}

.domain-name:hover {
  text-decoration: underline;
}

.custom-tag {
  margin-left: 8px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #67c23a 0%, #e6a23c 70%, #f56c6c 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  min-width: 32px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }
  
  .logo-section h1 {
    font-size: 20px;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .section-header {
    padding: 12px 16px;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-table .hidden-sm-and-down) {
  display: table-cell;
}

@media (max-width: 768px) {
  :deep(.el-table .hidden-sm-and-down) {
    display: none !important;
  }
}
</style>
