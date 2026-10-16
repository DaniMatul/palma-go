import { DashboardData } from '../types/dashboard'

export const dashboardData: DashboardData = {
  sales: {
    week: {
      total: 7840,
      points: [
        { label: 'Lun', amount: 920 }, { label: 'Mar', amount: 1120 }, { label: 'Mié', amount: 980 },
        { label: 'Jue', amount: 1260 }, { label: 'Vie', amount: 1485 }, { label: 'Sáb', amount: 1380 }, { label: 'Dom', amount: 695 },
      ],
    },
    month: {
      total: 28450,
      points: [
        { label: '1', amount: 820 }, { label: '5', amount: 1050 }, { label: '10', amount: 980 },
        { label: '15', amount: 1420 }, { label: '20', amount: 1210 }, { label: '25', amount: 1680 }, { label: '30', amount: 1540 },
      ],
    },
  },
  bestSelling: {
    day: [
      { name: 'Pepián', quantity: 38, total: 950 }, { name: 'Pollo dorado', quantity: 27, total: 756 },
      { name: 'Caldo de res', quantity: 19, total: 418 }, { name: 'Bebida', quantity: 16, total: 80 },
    ],
    month: [
      { name: 'Pepián', quantity: 420, total: 10500 }, { name: 'Pollo dorado', quantity: 315, total: 8820 },
      { name: 'Caldo de res', quantity: 248, total: 5456 }, { name: 'Bebida', quantity: 210, total: 1050 },
    ],
    year: [
      { name: 'Pepián', quantity: 4860, total: 121500 }, { name: 'Pollo dorado', quantity: 3920, total: 109760 },
      { name: 'Caldo de res', quantity: 3050, total: 67100 }, { name: 'Bebida', quantity: 2780, total: 13900 },
    ],
  },
  summary: { today: 1485, week: 7840, month: 28450, year: 248750 },
  operation: { orders: 42, completedSales: 1485, completedOrders: 42, inProgress: 6, cancelled: 2 },
}
