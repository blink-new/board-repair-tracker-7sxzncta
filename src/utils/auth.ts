import { blink } from '../blink/client'
import type { User } from '../types'

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const authUser = await blink.auth.me()
    if (!authUser) return null

    // Try to get user from database
    const users = await blink.db.users.list({
      where: { email: authUser.email },
      limit: 1
    })

    if (users.length > 0) {
      return users[0] as User
    }

    // Create new user if doesn't exist
    const newUser: Omit<User, 'created_at' | 'updated_at'> = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.displayName || authUser.email.split('@')[0],
      role: 'Admin', // Default role - set as admin
      branch: 'HQ' // Default branch
    }

    await blink.db.users.create(newUser)
    return { ...newUser, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const hasPermission = (user: User | null, requiredRoles: User['role'][]): boolean => {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

export const canUpdateStatus = (user: User | null, transfer: any): boolean => {
  if (!user) return false
  
  // Admin can update any status
  if (user.role === 'Admin') return true
  
  // HQ staff can only update outgoing transfers
  if (user.role === 'HQ Staff' && transfer.branch_from === 'HQ') return true
  
  // Technicians can update incoming transfers at their branch
  if (user.role === 'Technician' && transfer.branch_to === user.branch) return true
  
  return false
}