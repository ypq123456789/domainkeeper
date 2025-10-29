import dayjs from 'dayjs'

// 格式化日期
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

// 计算剩余天数
export const calculateDaysRemaining = (expirationDate) => {
  if (!expirationDate) return 'N/A'
  const now = dayjs()
  const expiry = dayjs(expirationDate)
  return expiry.diff(now, 'day')
}

// 获取状态颜色
export const getStatusColor = (daysRemaining) => {
  if (daysRemaining === 'N/A' || daysRemaining < 0) return '#909399'
  if (daysRemaining <= 7) return '#f56c6c'
  if (daysRemaining <= 30) return '#e6a23c'
  if (daysRemaining <= 90) return '#f7ba2a'
  return '#67c23a'
}

// 获取状态文本
export const getStatusText = (daysRemaining) => {
  if (daysRemaining === 'N/A') return '未知'
  if (daysRemaining < 0) return '已过期'
  if (daysRemaining <= 7) return '紧急'
  if (daysRemaining <= 30) return '警告'
  if (daysRemaining <= 90) return '注意'
  return '正常'
}

// 计算进度百分比
export const calculateProgress = (registrationDate, expirationDate) => {
  if (!registrationDate || !expirationDate) return 0
  
  const start = dayjs(registrationDate)
  const end = dayjs(expirationDate)
  const now = dayjs()
  
  const total = end.diff(start, 'day')
  const elapsed = now.diff(start, 'day')
  
  if (total <= 0) return 0
  
  const progress = (elapsed / total) * 100
  return Math.min(100, Math.max(0, progress))
}

// 域名分类
export const categorizeDomains = (domains) => {
  const cfTopLevel = []
  const cfSecondLevelAndCustom = []
  
  domains.forEach(domain => {
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
}

// 验证域名格式
export const validateDomain = (domain) => {
  const regex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return regex.test(domain)
}

// 复制到剪贴板
export const copyToClipboard = (text) => {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  } else {
    // 兜底方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return Promise.resolve()
  }
}
