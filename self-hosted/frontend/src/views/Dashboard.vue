<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>仪表板</h1>
      <p>域名管理概览</p>
    </div>

    <div class="dashboard-content">
      <!-- 快速统计 -->
      <div class="stats-overview">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-card total">
              <div class="stat-icon">
                <el-icon><Globe /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats?.total || 0 }}</div>
                <div class="stat-label">总域名数</div>
              </div>
            </div>
          </el-col>
          
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-card normal">
              <div class="stat-icon">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ normalCount }}</div>
                <div class="stat-label">正常域名</div>
              </div>
            </div>
          </el-col>
          
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-card warning">
              <div class="stat-icon">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ domainStats.expiring }}</div>
                <div class="stat-label">即将过期</div>
              </div>
            </div>
          </el-col>
          
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-card danger">
              <div class="stat-icon">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ domainStats.expired }}</div>
                <div class="stat-label">已过期</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 图表区域 -->
      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>域名状态分布</h3>
            </div>
            <div class="chart-content">
              <v-chart :option="statusChartOption" style="height: 300px;" />
            </div>
          </div>
        </el-col>
        
        <el-col :xs="24" :md="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>过期时间分布</h3>
            </div>
            <div class="chart-content">
              <v-chart :option="expirationChartOption" style="height: 300px;" />
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 即将过期域名列表 -->
      <div class="expiring-domains-card">
        <div class="card-header">
          <h3>即将过期域名（30天内）</h3>
          <el-tag v-if="expiringDomains.length > 0" type="warning">
            {{ expiringDomains.length }} 个
          </el-tag>
        </div>
        
        <div class="expiring-list" v-if="expiringDomains.length > 0">
          <el-table :data="expiringDomains" stripe>
            <el-table-column prop="domain" label="域名" />
            <el-table-column prop="expirationDate" label="到期日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.expirationDate) }}
              </template>
            </el-table-column>
            <el-table-column label="剩余天数" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.daysRemaining <= 7 ? 'danger' : 'warning'">
                  {{ scope.row.daysRemaining }}天
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="registrar" label="注册商" width="120" />
          </el-table>
        </div>
        
        <div v-else class="empty-state">
          <el-empty description="太好了！暂无即将过期的域名" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import {
  PieChart,
  BarChart
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Globe,
  SuccessFilled,
  WarningFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'
import { formatDate } from '@/utils/helpers'

use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

export default {
  name: 'Dashboard',
  components: {
    VChart,
    Globe,
    SuccessFilled,
    WarningFilled,
    CircleCloseFilled
  },
  setup() {
    const store = useStore()
    
    const stats = computed(() => store.getters['domains/stats'])
    const domains = computed(() => store.getters['domains/domains'])
    const domainStats = computed(() => store.getters['domains/domainStats'])
    
    const normalCount = computed(() => {
      return domainStats.value.total - domainStats.value.expired - domainStats.value.expiring
    })
    
    // 即将过期的域名（30天内）
    const expiringDomains = computed(() => {
      return domains.value.filter(domain => {
        return domain.daysRemaining > 0 && domain.daysRemaining <= 30
      }).sort((a, b) => a.daysRemaining - b.daysRemaining)
    })
    
    // 状态分布饼图配置
    const statusChartOption = computed(() => ({
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: '0'
      },
      series: [
        {
          name: '域名状态',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '30',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: normalCount.value, name: '正常', itemStyle: { color: '#67c23a' } },
            { value: domainStats.value.expiring, name: '即将过期', itemStyle: { color: '#e6a23c' } },
            { value: domainStats.value.expired, name: '已过期', itemStyle: { color: '#f56c6c' } }
          ]
        }
      ]
    }))
    
    // 过期时间分布柱状图配置
    const expirationChartOption = computed(() => {
      const categories = ['7天内', '30天内', '90天内', '一年内', '一年以上']
      const data = [
        domains.value.filter(d => d.daysRemaining > 0 && d.daysRemaining <= 7).length,
        domains.value.filter(d => d.daysRemaining > 7 && d.daysRemaining <= 30).length,
        domains.value.filter(d => d.daysRemaining > 30 && d.daysRemaining <= 90).length,
        domains.value.filter(d => d.daysRemaining > 90 && d.daysRemaining <= 365).length,
        domains.value.filter(d => d.daysRemaining > 365).length
      ]
      
      return {
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '域名数量',
            type: 'bar',
            data: data.map((value, index) => ({
              value,
              itemStyle: {
                color: index <= 1 ? '#f56c6c' : index === 2 ? '#e6a23c' : '#67c23a'
              }
            }))
          }
        ]
      }
    })
    
    const refreshData = async () => {
      await Promise.all([
        store.dispatch('domains/fetchDomains'),
        store.dispatch('domains/fetchStats')
      ])
    }
    
    onMounted(() => {
      refreshData()
    })
    
    return {
      stats,
      domains,
      domainStats,
      normalCount,
      expiringDomains,
      statusChartOption,
      expirationChartOption,
      formatDate
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h1 {
  color: #333;
  font-size: 28px;
  margin-bottom: 8px;
}

.dashboard-header p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.stats-overview {
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: transform 0.2s;
  border-left: 4px solid #409eff;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.total {
  border-left-color: #409eff;
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

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
  opacity: 0.8;
}

.stat-card.total .stat-icon {
  color: #409eff;
}

.stat-card.normal .stat-icon {
  color: #67c23a;
}

.stat-card.warning .stat-icon {
  color: #e6a23c;
}

.stat-card.danger .stat-icon {
  color: #f56c6c;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.chart-header {
  padding: 20px 24px 0;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.chart-content {
  padding: 20px;
}

.expiring-domains-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.expiring-list {
  padding: 0;
}

.empty-state {
  padding: 40px;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header h1 {
    font-size: 24px;
  }
  
  .stat-card {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .stat-icon {
    font-size: 24px;
    margin-right: 12px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}
</style>
