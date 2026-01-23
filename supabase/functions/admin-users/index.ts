import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      throw new Error('Unauthorized: Admin access required')
    }

    const { method, action, userId, planTier } = await req.json()

    // LIST: Get all users with their roles and subscriptions
    if (method === 'LIST') {
      // Get all users from auth.users via admin API
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()

      if (authUsersError) {
        throw new Error(`Failed to fetch users: ${authUsersError.message}`)
      }

      // Get profiles
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, created_at')

      // Get user roles
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')

      // Get user subscriptions
      const { data: subscriptions } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id, plan_tier, status, trial_ends_at, current_period_end')

      // Merge data
      const users = authUsers.users.map(authUser => {
        const profile = profiles?.find(p => p.user_id === authUser.id)
        const userRoles = roles?.filter(r => r.user_id === authUser.id) || []
        const subscription = subscriptions?.find(s => s.user_id === authUser.id)

        return {
          id: authUser.id,
          email: authUser.email || profile?.email || 'Unknown',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          roles: userRoles.map(r => r.role),
          subscription: subscription ? {
            plan_tier: subscription.plan_tier,
            status: subscription.status,
            trial_ends_at: subscription.trial_ends_at,
            current_period_end: subscription.current_period_end
          } : { plan_tier: 'free', status: 'active' },
          created_at: authUser.created_at,
          last_sign_in: authUser.last_sign_in_at,
          email_confirmed: authUser.email_confirmed_at ? true : false
        }
      })

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE: Delete a user
    if (method === 'DELETE') {
      if (!userId) {
        throw new Error('userId is required for DELETE')
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        throw new Error('Cannot delete your own account')
      }

      // Delete user from auth (this will cascade to profiles, roles, subscriptions due to FK)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        throw new Error(`Failed to delete user: ${deleteError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE_SUBSCRIPTION: Update a user's subscription tier
    if (method === 'UPDATE_SUBSCRIPTION') {
      if (!userId || !planTier) {
        throw new Error('userId and planTier are required')
      }

      const validTiers = ['free', 'lifetime_free', 'ai_starter', 'professional', 'executive']
      if (!validTiers.includes(planTier)) {
        throw new Error(`Invalid plan tier. Must be one of: ${validTiers.join(', ')}`)
      }

      // Check if subscription exists
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_tier: planTier,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          throw new Error(`Failed to update subscription: ${updateError.message}`)
        }
      } else {
        // Create new subscription
        const { error: insertError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_tier: planTier,
            status: 'active'
          })

        if (insertError) {
          throw new Error(`Failed to create subscription: ${insertError.message}`)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: `Subscription updated to ${planTier}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE_ROLE: Grant or revoke admin/moderator role
    if (method === 'UPDATE_ROLE') {
      if (!userId || !action) {
        throw new Error('userId and action are required')
      }

      if (userId === user.id) {
        throw new Error('Cannot modify your own role')
      }

      const { role } = await req.json() // 'admin' or 'moderator'
      const validRoles = ['admin', 'moderator', 'user']
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
      }

      if (action === 'grant') {
        // Check if role already exists
        const { data: existing } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', role)
          .single()

        if (!existing) {
          const { error: insertError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role })

          if (insertError) {
            throw new Error(`Failed to grant role: ${insertError.message}`)
          }
        }
      } else if (action === 'revoke') {
        const { error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role)

        if (deleteError) {
          throw new Error(`Failed to revoke role: ${deleteError.message}`)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: `Role ${action}ed successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid method')
  } catch (error) {
    console.error('Admin users error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
