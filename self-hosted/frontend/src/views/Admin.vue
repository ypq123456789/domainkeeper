<template>
  <div class="admin-container">
    <!-- 管理员头部导航 -->
    <div class="admin-header">
      <div class="header-content">
        <div class="logo-section">
          <h1>DomainKeeper 管理后台</h1>
        </div>
        
        <div class="nav-section">
          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            @select="handleMenuSelect"
          >
            <el-menu-item index="domains">域名管理</el-menu-item>
            <el-menu-item index="dashboard">仪表板</el-menu-item>
          </el-menu>
        </div>
        
        <div class="user-section">
          <el-dropdown @command="handleUserCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              管理员
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="frontend">返回前台</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="admin-main">
      <div class="content-container">
        <!-- 工具栏 -->
        <div class="toolbar-section">
          <div class="toolbar-left">
            <el-button type="primary" @click="handleSync" :loading="syncLoading">
              <el-icon><Refresh /></el-icon>
              同步 Cloudflare
            </el-button>
            <el-button @click="handleRefresh" :loading="loading">
              <el-icon><RefreshRight /></el-icon>
              刷新数据
            </el-button>
          </div>
          
          <div class="toolbar-right">
            <el-button type="success" @click="showAddDomainDialog = true">
              <el-icon><Plus /></el-icon>
              添加域名
            </el-button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-section" v-if="stats">
          <el-row :gutter="20">
            <el-col :xs="12" :sm="6" :md="3">
              <div class="stat-card">
                <div class="stat-number">{{ stats.total }}</div>
                <div class="stat-label">总域名</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6" :md="3">
              <div class="stat-card cloudflare">
                <div class="stat-number">{{ stats.cloudflare }}</div>
                <div class="stat-label">Cloudflare</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6" :md="3">
              <div class="stat-card custom">
                <div class="stat-number">{{ stats.custom }}</div>
                <div class="stat-label">自定义</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6" :md="3">
              <div class="stat-card warning">
                <div class="stat-number">{{ stats.expiring }}</div>
                <div class="stat-label">即将过期</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 域名表格 -->
        <div class="table-section">
          <el-table
            :data="domains"
            v-loading="loading"
            stripe
            border
            style="width: 100%"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column label="状态" width="60" align="center">
              <template #default="scope">
                <div 
                  :class="['status-dot', getStatusClass(scope.row.daysRemaining)]"
                  :title="getStatusText(scope.row.daysRemaining)"
                ></div>
              </template>
            </el-table-column>
            
            <el-table-column prop="domain" label="域名" min-width="150" sortable />
            
            <el-table-column prop="system" label="系统" width="100" />
            
            <el-table-column prop="registrar" label="注册商" width="120" />
            
            <el-table-column prop="registrationDate" label="注册日期" width="110">
              <template #default="scope">
                {{ formatDate(scope.row.registrationDate) }}
              </template>
            </el-table-column>
            
            <el-table-column prop="expirationDate" label="到期日期" width="110" sortable>
              <template #default="scope">
                {{ formatDate(scope.row.expirationDate) }}
              </template>
            </el-table-column>
            
            <el-table-column label="剩余天数" width="90" sortable>
              <template #default="scope">
                <el-text :type="getDaysRemainingType(scope.row.daysRemaining)">
                  {{ scope.row.daysRemaining === 'N/A' ? 'N/A' : scope.row.daysRemaining + '天' }}
                </el-text>
              </template>
            </el-table-column>
            
            <el-table-column label="类型" width="80">
              <template #default="scope">
                <el-tag v-if="scope.row.isCustom" size="small" type="info">自定义</el-tag>
                <el-tag v-else size="small" type="primary">CF</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button-group>
                  <el-button size="small" @click="editDomain(scope.row)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    size="small" 
                    @click="updateWhois(scope.row.domain)"
                    :disabled="scope.row.isCustom"
                    v-if="scope.row.domain.split('.').length === 2"
                  >
                    <el-icon><Refresh /></el-icon>
                  </el-button>
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="deleteDomain(scope.row)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 添加域名对话框 -->
    <el-dialog
      v-model="showAddDomainDialog"
      title="添加域名"
      width="500px"
    >
      <el-form
        ref="addDomainFormRef"
        :model="addDomainForm"
        :rules="addDomainRules"
        label-width="100px"
      >
        <el-form-item label="域名" prop="domain">
          <el-input v-model="addDomainForm.domain" placeholder="example.com" />
        </el-form-item>
        
        <el-form-item label="系统" prop="system">
          <el-input v-model="addDomainForm.system" placeholder="Cloudflare" />
        </el-form-item>
        
        <el-form-item label="注册商" prop="registrar">
          <el-input v-model="addDomainForm.registrar" placeholder="GoDaddy" />
        </el-form-item>
        
        <el-form-item label="注册日期" prop="registrationDate">
          <el-date-picker
            v-model="addDomainForm.registrationDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="到期日期" prop="expirationDate">
          <el-date-picker
            v-model="addDomainForm.expirationDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDomainDialog = false">取消</el-button>
          <el-button type="primary" @click="handleAddDomain" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑域名对话框 -->
    <el-dialog
      v-model="showEditDomainDialog"
      title="编辑域名"
      width="500px"
    >
      <el-form
        ref="editDomainFormRef"
        :model="editDomainForm"
        :rules="editDomainRules"
        label-width="100px"
      >
        <el-form-item label="域名">
          <el-input v-model="editDomainForm.domain" disabled />
        </el-form-item>
        
        <el-form-item label="系统" prop="system">
          <el-input v-model="editDomainForm.system" />
        </el-form-item>
        
        <el-form-item label="注册商" prop="registrar">
          <el-input v-model="editDomainForm.registrar" />
        </el-form-item>
        
        <el-form-item label="注册日期" prop="registrationDate">
          <el-date-picker
            v-model="editDomainForm.registrationDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="到期日期" prop="expirationDate">
          <el-date-picker
            v-model="editDomainForm.expirationDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDomainDialog = false">取消</el-button>
          <el-button type="primary" @click="handleEditDomain" :loading="submitLoading">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled,
  ArrowDown,
  Refresh,
  RefreshRight,
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { formatDate, validateDomain, getStatusText } from '@/utils/helpers'
import dayjs from 'dayjs'

export default {
  name: 'Admin',
  components: {
    UserFilled,
    ArrowDown,
    Refresh,
    RefreshRight,
    Plus,
    Edit,
    Delete
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const activeMenu = ref('domains')
    const loading = ref(false)
    const syncLoading = ref(false)
    const submitLoading = ref(false)
    const showAddDomainDialog = ref(false)
    const showEditDomainDialog = ref(false)
    const addDomainFormRef = ref()
    const editDomainFormRef = ref()
    
    const domains = computed(() => store.getters['domains/domains'])
    const stats = computed(() => store.getters['domains/stats'])
    
    // 表单数据
    const addDomainForm = reactive({
      domain: '',
      system: '',
      registrar: '',
      registrationDate: '',
      expirationDate: ''
    })
    
    const editDomainForm = reactive({
      id: null,
      domain: '',
      system: '',
      registrar: '',
      registrationDate: '',
      expirationDate: ''
    })
    
    // 表单验证规则
    const addDomainRules = {
      domain: [
        { required: true, message: '请输入域名', trigger: 'blur' },
        { validator: (rule, value, callback) => {
          if (!validateDomain(value)) {
            callback(new Error('请输入有效的域名'))
          } else {
            callback()
          }
        }, trigger: 'blur' }
      ],
      system: [{ required: true, message: '请输入系统', trigger: 'blur' }],
      registrar: [{ required: true, message: '请输入注册商', trigger: 'blur' }],
      registrationDate: [{ required: true, message: '请选择注册日期', trigger: 'change' }],
      expirationDate: [{ required: true, message: '请选择到期日期', trigger: 'change' }]
    }
    
    const editDomainRules = {
      system: [{ required: true, message: '请输入系统', trigger: 'blur' }],
      registrar: [{ required: true, message: '请输入注册商', trigger: 'blur' }],
      registrationDate: [{ required: true, message: '请选择注册日期', trigger: 'change' }],
      expirationDate: [{ required: true, message: '请选择到期日期', trigger: 'change' }]
    }
    
    // 刷新数据
    const handleRefresh = async () => {
      loading.value = true
      try {
        const [domainsResult, statsResult] = await Promise.all([
          store.dispatch('domains/fetchDomains'),
          store.dispatch('domains/fetchStats')
        ])
        
        if (!domainsResult.success) {
          ElMessage.error(domainsResult.message)
        }
        if (!statsResult.success) {
          ElMessage.error(statsResult.message)
        }
      } finally {
        loading.value = false
      }
    }
    
    // 同步Cloudflare
    const handleSync = async () => {
      syncLoading.value = true
      try {
        const result = await store.dispatch('domains/syncCloudflare')
        if (result.success) {
          ElMessage.success(result.message)
          // 刷新统计信息
          await store.dispatch('domains/fetchStats')
        } else {
          ElMessage.error(result.message)
        }
      } finally {
        syncLoading.value = false
      }
    }
    
    // 添加域名
    const handleAddDomain = async () => {
      const valid = await addDomainFormRef.value.validate().catch(() => false)
      if (!valid) return
      
      submitLoading.value = true
      try {
        const domainData = {
          ...addDomainForm,
          registrationDate: dayjs(addDomainForm.registrationDate).format('YYYY-MM-DD'),
          expirationDate: dayjs(addDomainForm.expirationDate).format('YYYY-MM-DD')
        }
        
        const result = await store.dispatch('domains/addDomain', domainData)
        if (result.success) {
          ElMessage.success(result.message)
          showAddDomainDialog.value = false
          resetAddDomainForm()
          await store.dispatch('domains/fetchStats')
        } else {
          ElMessage.error(result.message)
        }
      } finally {
        submitLoading.value = false
      }
    }
    
    // 编辑域名
    const editDomain = (domain) => {
      editDomainForm.id = domain.id
      editDomainForm.domain = domain.domain
      editDomainForm.system = domain.system
      editDomainForm.registrar = domain.registrar
      editDomainForm.registrationDate = domain.registrationDate ? new Date(domain.registrationDate) : ''
      editDomainForm.expirationDate = domain.expirationDate ? new Date(domain.expirationDate) : ''
      showEditDomainDialog.value = true
    }
    
    const handleEditDomain = async () => {
      const valid = await editDomainFormRef.value.validate().catch(() => false)
      if (!valid) return
      
      submitLoading.value = true
      try {
        const domainData = {
          system: editDomainForm.system,
          registrar: editDomainForm.registrar,
          registrationDate: dayjs(editDomainForm.registrationDate).format('YYYY-MM-DD'),
          expirationDate: dayjs(editDomainForm.expirationDate).format('YYYY-MM-DD')
        }
        
        const result = await store.dispatch('domains/updateDomain', {
          id: editDomainForm.id,
          domainData
        })
        
        if (result.success) {
          ElMessage.success(result.message)
          showEditDomainDialog.value = false
          await store.dispatch('domains/fetchStats')
        } else {
          ElMessage.error(result.message)
        }
      } finally {
        submitLoading.value = false
      }
    }
    
    // 删除域名
    const deleteDomain = async (domain) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除域名 "${domain.domain}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const result = await store.dispatch('domains/deleteDomain', domain.id)
        if (result.success) {
          ElMessage.success(result.message)
          await store.dispatch('domains/fetchStats')
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        // 用户取消删除
      }
    }
    
    // 更新WHOIS信息
    const updateWhois = async (domain) => {
      try {
        const result = await store.dispatch('domains/updateWhois', domain)
        if (result.success) {
          ElMessage.success(result.message)
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        ElMessage.error('WHOIS更新失败')
      }
    }
    
    // 重置表单
    const resetAddDomainForm = () => {
      Object.assign(addDomainForm, {
        domain: '',
        system: '',
        registrar: '',
        registrationDate: '',
        expirationDate: ''
      })
    }
    
    // 菜单选择
    const handleMenuSelect = (index) => {
      activeMenu.value = index
      if (index === 'dashboard') {
        router.push('/dashboard')
      }
    }
    
    // 用户菜单
    const handleUserCommand = (command) => {
      switch (command) {
        case 'frontend':
          router.push('/domains')
          break
        case 'logout':
          store.dispatch('auth/logout')
          router.push('/login')
          break
      }
    }
    
    // 状态相关函数
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
    
    onMounted(() => {
      handleRefresh()
    })
    
    return {
      activeMenu,
      loading,
      syncLoading,
      submitLoading,
      showAddDomainDialog,
      showEditDomainDialog,
      addDomainFormRef,
      editDomainFormRef,
      domains,
      stats,
      addDomainForm,
      editDomainForm,
      addDomainRules,
      editDomainRules,
      handleRefresh,
      handleSync,
      handleAddDomain,
      editDomain,
      handleEditDomain,
      deleteDomain,
      updateWhois,
      handleMenuSelect,
      handleUserCommand,
      formatDate,
      getStatusClass,
      getStatusText,
      getDaysRemainingType
    }
  }
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.admin-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo-section h1 {
  color: #409eff;
  font-size: 20px;
  margin: 0;
}

.nav-section {
  flex: 1;
  display: flex;
  justify-content: center;
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

.admin-main {
  padding: 20px;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #409eff;
}

.stat-card.cloudflare {
  border-left-color: #f7931e;
}

.stat-card.custom {
  border-left-color: #909399;
}

.stat-card.warning {
  border-left-color: #e6a23c;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    padding-top: 12px;
    padding-bottom: 12px;
  }
  
  .nav-section {
    order: 3;
    width: 100%;
    margin-top: 12px;
  }
  
  .toolbar-section {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    justify-content: center;
  }
}
</style>
