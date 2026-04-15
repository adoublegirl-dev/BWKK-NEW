import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Vant组件库
import { 
  Button, 
  Cell, 
  CellGroup, 
  NavBar, 
  Tabbar, 
  TabbarItem,
  Icon,
  Toast,
  Dialog,
  Field,
  Form,
  List,
  PullRefresh,
  Card,
  Tag,
  Image,
  Uploader,
  Popup,
  Picker,
  Search,
  Loading,
  Empty,
  Divider,
  Grid,
  GridItem,
  ActionSheet,
  ShareSheet,
  SwipeCell,
  Stepper,
  NoticeBar,
  Collapse,
  CollapseItem,
  Tabs,
  Tab
} from 'vant'

// Vant样式
import 'vant/lib/index.css'

const app = createApp(App)

// 注册Vant组件
const components = [
  Button, Cell, CellGroup, NavBar, Tabbar, TabbarItem,
  Icon, Toast, Dialog, Field, Form, List, PullRefresh,
  Card, Tag, Image, Uploader, Popup, Picker, Search,
  Loading, Empty, Divider, Grid, GridItem, ActionSheet,
  ShareSheet, SwipeCell, Stepper, NoticeBar, Collapse, CollapseItem,
  Tabs, Tab
]

components.forEach(component => {
  app.use(component)
})

app.use(createPinia())
app.use(router)

app.mount('#app')