'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, UserPlus, Loader2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addEmployeeAction, getEmployees, updateEmployeeAction } from '@/actions/facility.action'
import { addEmployeeSchema, updateEmployeeSchema } from '@/lib/validations/facility'
import { User, UserRole } from '@/types'
import { roleConfig } from '@/config/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { z } from 'zod'

type AddEmployeeFormValues = z.infer<typeof addEmployeeSchema>
type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>

export default function FacilityManagementPage() {
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null)
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false)
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)
  const [employees, setEmployees] = useState<User[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)

  const employeeForm = useForm<AddEmployeeFormValues>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'nurse',
      phone: '',
      designation: '',
      payRatePerHour: '',
    },
  })

  const editEmployeeForm = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
  })

  // Get current user role
  useEffect(() => {
    async function getCurrentUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentUserRole(profile.role as UserRole)
        }
      }
    }
    getCurrentUserRole()
  }, [])

  async function onEmployeeSubmit(data: AddEmployeeFormValues) {
    setIsSubmittingEmployee(true)
    try {
      const result = await addEmployeeAction(data)
      
      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        toast.error(firstError || 'Validation failed')
        return
      }

      if (result?.data) {
        if (result.data.success) {
          toast.success('Employee added successfully')
          setIsEmployeeDialogOpen(false)
          employeeForm.reset()
          // Reload employees list
          loadEmployees()
        } else if (result.data.error) {
          toast.error(result.data.error)
        } else {
          toast.error('Failed to add employee')
        }
      } else {
        toast.error('Failed to add employee')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add employee')
    } finally {
      setIsSubmittingEmployee(false)
    }
  }

  const loadEmployees = useCallback(async () => {
    setIsLoadingEmployees(true)
    try {
      const result = await getEmployees({})
      if (result?.data?.success && result.data.data) {
        setEmployees(result.data.data.employees)
      } else if (result?.data?.error) {
        toast.error(result.data.error)
      }
    } catch (error) {
      toast.error('Failed to load employees')
    } finally {
      setIsLoadingEmployees(false)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  function handleEditClick(employee: User) {
    setEditingEmployee(employee)
    // Filter out 'owner' and 'patient' roles as they're not editable through this form
    const editableRole = (employee.role === 'owner' || employee.role === 'patient') 
      ? 'admin' as const 
      : employee.role as 'admin' | 'manager' | 'doctor' | 'psych' | 'nurse' | 'driver'
    
    editEmployeeForm.reset({
      userId: employee.id,
      email: employee.email,
      firstName: employee.first_name || '',
      lastName: employee.last_name || '',
      role: editableRole,
      phone: employee.phone || '',
      designation: employee.designation || '',
      payRatePerHour: employee.pay_rate_per_hour ? employee.pay_rate_per_hour.toString() : '',
    })
    setIsEditDialogOpen(true)
  }

  async function onEmployeeUpdateSubmit(data: UpdateEmployeeFormValues) {
    setIsSubmittingUpdate(true)
    try {
      const result = await updateEmployeeAction(data)
      
      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        toast.error(firstError || 'Validation failed')
        return
      }

      if (result?.data) {
        if (result.data.success) {
          toast.success('Employee updated successfully')
          setIsEditDialogOpen(false)
          setEditingEmployee(null)
          editEmployeeForm.reset()
          loadEmployees()
        } else if (result.data.error) {
          toast.error(result.data.error)
        } else {
          toast.error('Failed to update employee')
        }
      } else {
        toast.error('Failed to update employee')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function getRoleLabel(role: string) {
    return roleConfig[role as keyof typeof roleConfig]?.label || role
  }


  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
              fontSize: '44px',
              fontWeight: 400,
              color: 'black',
              wordWrap: 'break-word'
            }}
          >
            Facility Overview
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Beds, occupancy, staff capacity, and revenue projections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Employee Dialog */}
          <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee account with the specified role.
                </DialogDescription>
              </DialogHeader>
              <Form {...employeeForm}>
                <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={employeeForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="doctor">Doctor</SelectItem>
                              <SelectItem value="psych">Psych</SelectItem>
                              <SelectItem value="nurse">Nurse</SelectItem>
                              <SelectItem value="driver">Driver</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Senior Nurse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={employeeForm.control}
                    name="payRatePerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Rate Per Hour (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="25.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the hourly pay rate for future calculations
                        </p>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEmployeeDialogOpen(false)}
                      disabled={isSubmittingEmployee}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingEmployee}>
                      {isSubmittingEmployee ? 'Adding...' : 'Add Employee'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Occupancy */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Occupancy (this month)</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">78</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              14%
            </span>
            <span className="text-gray-400 text-sm">in target range</span>
          </div>
        </div>

        {/* Beds Available */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Beds Available (next 30 days)</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">11</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              5%
            </span>
            <span className="text-gray-400 text-sm">empty beds beyond 6 weeks</span>
          </div>
        </div>

        {/* Confirmed Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Confirmed Revenue</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">$142K</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              40%
            </span>
            <span className="text-gray-400 text-sm">Booked for next 60 days</span>
          </div>
        </div>

        {/* Staff Load */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Staff Load</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">86%</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              7%
            </span>
            <span className="text-gray-400 text-sm">High-monitor overtime</span>
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Employees</h2>
          <span className="text-sm text-gray-500">{employees.length} total</span>
        </div>
        
        {isLoadingEmployees ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">No employees found. Add your first employee using the button above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pay Rate/Hour
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  {(currentUserRole === 'admin' || currentUserRole === 'owner') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        roleConfig[employee.role as keyof typeof roleConfig]?.color || 'bg-gray-100'
                      } text-white`}>
                        {getRoleLabel(employee.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.designation || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.pay_rate_per_hour ? `$${parseFloat(employee.pay_rate_per_hour.toString()).toFixed(2)}` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(employee.created_at)}</div>
                    </td>
                    {(currentUserRole === 'admin' || currentUserRole === 'owner') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(employee)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Note: Password cannot be changed here.
            </DialogDescription>
          </DialogHeader>
          <Form {...editEmployeeForm}>
            <form onSubmit={editEmployeeForm.handleSubmit(onEmployeeUpdateSubmit)} className="space-y-4">
              <FormField
                control={editEmployeeForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editEmployeeForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editEmployeeForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editEmployeeForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editEmployeeForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="psych">Psych</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editEmployeeForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editEmployeeForm.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Nurse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editEmployeeForm.control}
                name="payRatePerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Rate Per Hour (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="25.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the hourly pay rate for future calculations
                    </p>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingEmployee(null)
                    editEmployeeForm.reset()
                  }}
                  disabled={isSubmittingUpdate}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingUpdate}>
                  {isSubmittingUpdate ? 'Updating...' : 'Update Employee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
