import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  Euro, 
  FileText, 
  AlertTriangle, 
  Calendar,
  Users,
  CreditCard,
  Building
} from 'lucide-react'

interface DashboardData {
  monthlyTotalCents: number
  monthlyTotal: string
  currency: string
  activeContractsCount: number
  upcomingRenewalsCount: number
  upcomingRenewals: Array<{
    id: string
    title: string
    nextRenewalDate: string
    provider?: {
      name: string
    }
    assignedMember?: {
      name: string
    }
  }>
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard')
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data')
  }
  return response.json()
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your family's financial commitments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.monthlyTotal || '0.00'} {data?.currency || 'EUR'}
            </div>
            <p className="text-xs text-muted-foreground">
              All active contracts & fixed costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeContractsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.upcomingRenewalsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Active family members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Renewals */}
      {data?.upcomingRenewals && data.upcomingRenewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Upcoming Renewals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.upcomingRenewals.map((renewal) => (
                <div
                  key={renewal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{renewal.title}</h4>
                    <p className="text-sm text-gray-500">
                      {renewal.provider?.name} • {renewal.assignedMember?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-warning border-warning">
                      {new Date(renewal.nextRenewalDate).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Add Contract</span>
            </button>
            <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Add Fixed Cost</span>
            </button>
            <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Building className="h-5 w-5 text-primary" />
              <span className="font-medium">Add Asset</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
