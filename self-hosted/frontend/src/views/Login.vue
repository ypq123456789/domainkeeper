<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo-section">
        <h1>DomainKeeper</h1>
        <p>域名管理系统</p>
      </div>
      
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="前台访问" name="frontend">
          <el-form
            ref="frontendFormRef"
            :model="frontendForm"
            :rules="frontendRules"
            label-width="0"
            class="login-form"
            @submit.prevent="handleFrontendLogin"
          >
            <el-form-item prop="password">
              <el-input
                v-model="frontendForm.password"
                type="password"
                placeholder="请输入访问密码（如无密码直接登录）"
                size="large"
                show-password
                @keyup.enter="handleFrontendLogin"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                class="login-btn"
                @click="handleFrontendLogin"
              >
                {{ loading ? '登录中...' : '进入系统' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="管理员登录" name="admin">
          <el-form
            ref="adminFormRef"
            :model="adminForm"
            :rules="adminRules"
            label-width="0"
            class="login-form"
            @submit.prevent="handleAdminLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="adminForm.username"
                placeholder="管理员用户名"
                size="large"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="adminForm.password"
                type="password"
                placeholder="管理员密码"
                size="large"
                show-password
                @keyup.enter="handleAdminLogin"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                class="login-btn"
                @click="handleAdminLogin"
              >
                {{ loading ? '登录中...' : '管理员登录' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <div class="footer">
      <p>Powered by DomainKeeper v2.0.0 | © 2023 bacon159. All rights reserved.</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

export default {
  name: 'Login',
  components: {
    User,
    Lock
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const activeTab = ref('frontend')
    const loading = ref(false)
    const frontendFormRef = ref()
    const adminFormRef = ref()
    
    const frontendForm = reactive({
      password: ''
    })
    
    const adminForm = reactive({
      username: 'admin',
      password: ''
    })
    
    const frontendRules = {
      // 前台访问密码为空时允许
    }
    
    const adminRules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
      ]
    }
    
    const handleFrontendLogin = async () => {
      if (loading.value) return
      
      loading.value = true
      
      try {
        const result = await store.dispatch('auth/login', {
          password: frontendForm.password,
          type: 'frontend'
        })
        
        if (result.success) {
          ElMessage.success('登录成功')
          router.push('/domains')
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        ElMessage.error('登录失败')
      } finally {
        loading.value = false
      }
    }
    
    const handleAdminLogin = async () => {
      if (loading.value) return
      
      const valid = await adminFormRef.value.validate().catch(() => false)
      if (!valid) return
      
      loading.value = true
      
      try {
        const result = await store.dispatch('auth/login', {
          username: adminForm.username,
          password: adminForm.password
        })
        
        if (result.success) {
          ElMessage.success('登录成功')
          router.push('/admin')
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        ElMessage.error('登录失败')
      } finally {
        loading.value = false
      }
    }
    
    return {
      activeTab,
      loading,
      frontendFormRef,
      adminFormRef,
      frontendForm,
      adminForm,
      frontendRules,
      adminRules,
      handleFrontendLogin,
      handleAdminLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  backdrop-filter: blur(10px);
}

.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.logo-section h1 {
  color: #333;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.logo-section p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.login-tabs {
  width: 100%;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 30px;
}

.login-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.login-form {
  width: 100%;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.footer {
  position: fixed;
  bottom: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.footer p {
  margin: 0;
}

@media (max-width: 768px) {
  .login-card {
    padding: 30px 20px;
  }
  
  .logo-section h1 {
    font-size: 28px;
  }
}
</style>
