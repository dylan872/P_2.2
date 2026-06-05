/**
 * Unified Database Interface
 * 
 * Provides a consistent API for database operations regardless of
 * whether using Supabase or direct PostgreSQL connection.
 * 
 * Usage:
 *   import { db } from '@/lib/db'
 *   
 *   // Query members
 *   const members = await db.members.findMany()
 *   const member = await db.members.findById(id)
 *   
 *   // Query claims
 *   const claims = await db.claims.findMany({ memberId })
 */

import { getDatabaseMode } from './config'
import { createClient } from '../supabase/server'
import { query, transaction as pgTransaction } from './postgres'
import { PoolClient, QueryResultRow } from 'pg'

// Re-export query for use in route files
export { query }

// ─── Type definitions ────────────────────────────────────────────────────────

export interface Member {
  id: string
  member_number: string
  national_id: string
  full_name: string
  date_of_birth: string
  gender: 'MALE' | 'FEMALE'
  phone_number: string
  address: string
  insurer_type: string
  policy_number: string
  cover_status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
  cover_expiry: string
  role: 'user' | 'admin'
  profile_picture_url?: string
  created_at: string
  updated_at: string
}

export interface Provider {
  id: string
  facility_code: string
  facility_name: string
  facility_type: string
  county: string
  sub_county: string
  phone_number?: string
  email?: string
  is_accredited: boolean
  created_at: string
}

export interface Claim {
  id: string
  claim_number: string
  member_id: string
  provider_id: string
  service_date: string
  diagnosis_code: string
  diagnosis_desc?: string
  service_type: string
  total_billed: number
  approved_amount?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'FLAGGED'
  fraud_score: number
  fraud_label: 'VALID' | 'SUSPICIOUS' | 'FRAUDULENT'
  notes?: string
  viewed_by_admin: boolean
  created_at: string
  updated_at: string
  member?: Member
  provider?: Provider
  fraud_flags?: FraudFlag[]
}

export interface FraudFlag {
  id: string
  claim_id: string
  flag_type: string
  flag_reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  created_at: string
}

// ─── Database Operations ─────────────────────────────────────────────────────

class DatabaseClient {
  private mode = getDatabaseMode()

  // ─── Members ─────────────────────────────────────────────────────────────────
  
  members = {
    findById: async (id: string): Promise<Member | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single()
        return data
      } else {
        const result = await query<Member>(
          'SELECT * FROM members WHERE id = $1',
          [id]
        )
        return result.rows[0] || null
      }
    },

    findByMemberNumber: async (memberNumber: string): Promise<Member | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('member_number', memberNumber)
          .single()
        return data
      } else {
        const result = await query<Member>(
          'SELECT * FROM members WHERE member_number = $1',
          [memberNumber]
        )
        return result.rows[0] || null
      }
    },

    findByNationalId: async (nationalId: string): Promise<Member | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('national_id', nationalId)
          .single()
        return data
      } else {
        const result = await query<Member>(
          'SELECT * FROM members WHERE national_id = $1',
          [nationalId]
        )
        return result.rows[0] || null
      }
    },

    authenticate: async (memberNumber: string, nationalId: string): Promise<Member | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('member_number', memberNumber)
          .eq('national_id', nationalId)
          .single()
        return data
      } else {
        const result = await query<Member>(
          'SELECT * FROM members WHERE member_number = $1 AND national_id = $2',
          [memberNumber, nationalId]
        )
        return result.rows[0] || null
      }
    },

    updateProfile: async (id: string, data: Partial<Member>): Promise<Member | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data: updated } = await supabase
          .from('members')
          .update(data)
          .eq('id', id)
          .select()
          .single()
        return updated
      } else {
        const fields = Object.keys(data)
        const values = Object.values(data)
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
        const result = await query<Member>(
          `UPDATE members SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id, ...values]
        )
        return result.rows[0] || null
      }
    },
  }

  // ─── Providers ───────────────────────────────────────────────────────────────
  
  providers = {
    findById: async (id: string): Promise<Provider | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('providers')
          .select('*')
          .eq('id', id)
          .single()
        return data
      } else {
        const result = await query<Provider>(
          'SELECT * FROM providers WHERE id = $1',
          [id]
        )
        return result.rows[0] || null
      }
    },

    findByFacilityCode: async (code: string): Promise<Provider | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('providers')
          .select('*')
          .eq('facility_code', code)
          .single()
        return data
      } else {
        const result = await query<Provider>(
          'SELECT * FROM providers WHERE facility_code = $1',
          [code]
        )
        return result.rows[0] || null
      }
    },

    findAll: async (): Promise<Provider[]> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('providers')
          .select('*')
          .order('facility_name')
        return data || []
      } else {
        const result = await query<Provider>(
          'SELECT * FROM providers ORDER BY facility_name'
        )
        return result.rows
      }
    },
  }

  // ─── Claims ──────────────────────────────────────────────────────────────────
  
  claims = {
    findById: async (id: string): Promise<Claim | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('claims')
          .select(`
            *,
            member:members(*),
            provider:providers(*),
            fraud_flags(*)
          `)
          .eq('id', id)
          .single()
        return data
      } else {
        const result = await query<Claim>(
          `SELECT c.*, 
            row_to_json(m.*) as member,
            row_to_json(p.*) as provider
           FROM claims c
           LEFT JOIN members m ON c.member_id = m.id
           LEFT JOIN providers p ON c.provider_id = p.id
           WHERE c.id = $1`,
          [id]
        )
        if (result.rows[0]) {
          const flags = await query<FraudFlag>(
            'SELECT * FROM fraud_flags WHERE claim_id = $1',
            [id]
          )
          result.rows[0].fraud_flags = flags.rows
        }
        return result.rows[0] || null
      }
    },

    findByMemberId: async (memberId: string): Promise<Claim[]> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('claims')
          .select(`
            *,
            provider:providers(facility_name, facility_code)
          `)
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
        return data || []
      } else {
        const result = await query<Claim>(
          `SELECT c.*, 
            json_build_object('facility_name', p.facility_name, 'facility_code', p.facility_code) as provider
           FROM claims c
           LEFT JOIN providers p ON c.provider_id = p.id
           WHERE c.member_id = $1
           ORDER BY c.created_at DESC`,
          [memberId]
        )
        return result.rows
      }
    },

    findAll: async (options?: {
      status?: string
      fraudLabel?: string
      limit?: number
      offset?: number
    }): Promise<Claim[]> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        let qry = supabase
          .from('claims')
          .select(`
            *,
            member:members(full_name, member_number),
            provider:providers(facility_name, facility_code)
          `)
        
        if (options?.status) {
          qry = qry.eq('status', options.status)
        }
        if (options?.fraudLabel) {
          qry = qry.eq('fraud_label', options.fraudLabel)
        }
        
        qry = qry.order('created_at', { ascending: false })
        
        if (options?.limit) {
          qry = qry.limit(options.limit)
        }
        if (options?.offset) {
          qry = qry.range(options.offset, options.offset + (options.limit || 10) - 1)
        }
        
        const { data } = await qry
        return data || []
      } else {
        let sql = `
          SELECT c.*, 
            json_build_object('full_name', m.full_name, 'member_number', m.member_number) as member,
            json_build_object('facility_name', p.facility_name, 'facility_code', p.facility_code) as provider
          FROM claims c
          LEFT JOIN members m ON c.member_id = m.id
          LEFT JOIN providers p ON c.provider_id = p.id
          WHERE 1=1
        `
        const params: unknown[] = []
        let paramIndex = 1

        if (options?.status) {
          sql += ` AND c.status = $${paramIndex++}`
          params.push(options.status)
        }
        if (options?.fraudLabel) {
          sql += ` AND c.fraud_label = $${paramIndex++}`
          params.push(options.fraudLabel)
        }
        
        sql += ' ORDER BY c.created_at DESC'
        
        if (options?.limit) {
          sql += ` LIMIT $${paramIndex++}`
          params.push(options.limit)
        }
        if (options?.offset) {
          sql += ` OFFSET $${paramIndex++}`
          params.push(options.offset)
        }

        const result = await query<Claim>(sql, params)
        return result.rows
      }
    },

     create: async (data: Partial<Claim>): Promise<Claim | null> => {
       if (this.mode === 'supabase') {
         const supabase = await createClient()
         const { data: created } = await supabase
           .from('claims')
           .insert(data)
           .select('*')
           .single()
         return created as Claim | null
       } else {
         const fields = Object.keys(data)
         const values = Object.values(data)
         const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ')
         const result = await query<Claim>(
           `INSERT INTO claims (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
           values
         )
         return result.rows[0] || null
       }
     },

    update: async (id: string, data: Partial<Claim>): Promise<Claim | null> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data: updated } = await supabase
          .from('claims')
          .update(data)
          .eq('id', id)
          .select()
          .single()
        return updated
      } else {
        const fields = Object.keys(data)
        const values = Object.values(data)
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
        const result = await query<Claim>(
          `UPDATE claims SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id, ...values]
        )
        return result.rows[0] || null
      }
    },

      getUnviewedCount: async (): Promise<number> => {
        if (this.mode === 'supabase') {
          const supabase = await createClient()
          const { count } = await supabase
            .from('claims')
            .select('*', { count: 'exact', head: true })
            .eq('admin_viewed', false)
          return count || 0
        } else {
          const result = await query<{ count: string }>(
            'SELECT COUNT(*) as count FROM claims WHERE viewed_by_admin = false'
          )
          return parseInt(result.rows[0]?.count || '0', 10)
        }
      },

      markAsViewed: async (id: string): Promise<void> => {
        if (this.mode === 'supabase') {
          const supabase = await createClient()
          await supabase
            .from('claims')
            .update({ viewed_by_admin: true })
            .eq('id', id)
        } else {
          await query('UPDATE claims SET viewed_by_admin = true WHERE id = $1', [id])
        }
      },

      markAllAsViewed: async (): Promise<void> => {
        if (this.mode === 'supabase') {
          const supabase = await createClient()
          await supabase
            .from('claims')
            .update({ viewed_by_admin: true })
            .eq('viewed_by_admin', false)
        } else {
          await query('UPDATE claims SET viewed_by_admin = true WHERE viewed_by_admin = false')
        }
      },
  }

  // ─── Fraud Flags ─────────────────────────────────────────────────────────────
  
  fraudFlags = {
    createMany: async (flags: Partial<FraudFlag>[]): Promise<void> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        await supabase.from('fraud_flags').insert(flags)
      } else {
        for (const flag of flags) {
          await query(
            'INSERT INTO fraud_flags (claim_id, flag_type, flag_reason, severity) VALUES ($1, $2, $3, $4)',
            [flag.claim_id, flag.flag_type, flag.flag_reason, flag.severity]
          )
        }
      }
    },

    findByClaimId: async (claimId: string): Promise<FraudFlag[]> => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('fraud_flags')
          .select('*')
          .eq('claim_id', claimId)
        return data || []
      } else {
        const result = await query<FraudFlag>(
          'SELECT * FROM fraud_flags WHERE claim_id = $1',
          [claimId]
        )
        return result.rows
      }
    },
  }

   // ─── Stats & Reports ─────────────────────────────────────────────────────────
   
    stats = {
      getDashboardStats: async () => {
        if (this.mode === 'supabase') {
          const supabase = await createClient()
          
          const [totalResult, validResult, suspiciousResult, fraudulentResult, amountResult] = await Promise.all([
            supabase.from('claims').select('*', { count: 'exact', head: true }),
            supabase.from('claims').select('*', { count: 'exact', head: true }).eq('fraud_label', 'VALID'),
            supabase.from('claims').select('*', { count: 'exact', head: true }).eq('fraud_label', 'SUSPICIOUS'),
            supabase.from('claims').select('*', { count: 'exact', head: true }).eq('fraud_label', 'FRAUDULENT'),
            supabase.from('claims').select('total_billed'),
          ])

          const totalAmount = amountResult.data?.reduce((sum, c) => sum + (c.total_billed || 0), 0) || 0

          return {
            totalClaims: totalResult.count || 0,
            validClaims: validResult.count || 0,
            suspiciousClaims: suspiciousResult.count || 0,
            fraudulentClaims: fraudulentResult.count || 0,
            totalAmount,
          }
        } else {
          const result = await query<{
            total_claims: string
            valid_claims: string
            suspicious_claims: string
            fraudulent_claims: string
            total_amount: string
          }>(`
            SELECT 
              COUNT(*) as total_claims,
              COUNT(*) FILTER (WHERE fraud_label = 'VALID') as valid_claims,
              COUNT(*) FILTER (WHERE fraud_label = 'SUSPICIOUS') as suspicious_claims,
              COUNT(*) FILTER (WHERE fraud_label = 'FRAUDULENT') as fraudulent_claims,
              SUM(total_billed) as total_amount
            FROM claims
          `)
          return {
            totalClaims: parseInt(result.rows[0]?.total_claims || "0", 10),
            validClaims: parseInt(result.rows[0]?.valid_claims || "0", 10),
            suspiciousClaims: parseInt(result.rows[0]?.suspicious_claims || "0", 10),
            fraudulentClaims: parseInt(result.rows[0]?.fraudulent_claims || "0", 10),
            totalAmount: parseFloat(result.rows[0]?.total_amount || "0"),
            }
        }
      },

     getProviderFraudStats: async () => {
       if (this.mode === 'supabase') {
         const supabase = await createClient()
         const { data } = await supabase
           .from('claims')
           .select(`
             provider_id,
             fraud_label,
             providers(facility_name, facility_code)
           `)
         
         // Aggregate by provider
         const providerMap = new Map<string, { 
           providerId: string
           facilityName: string
           facilityCode: string
           totalClaims: number
           fraudulentClaims: number
         }>()
 
         data?.forEach((claim: { provider_id: string; fraud_label: string; providers: { facility_name: string; facility_code: string }[] | null }) => {
           const provider = claim.providers?.[0];
           if (!provider) {
             return;
           }
           const existing = providerMap.get(claim.provider_id) || {
             providerId: claim.provider_id,
             facilityName: provider.facility_name,
             facilityCode: provider.facility_code,
             totalClaims: 0,
             fraudulentClaims: 0,
           }
           existing.totalClaims++
           if (claim.fraud_label === 'FRAUDULENT') {
             existing.fraudulentClaims++
           }
           providerMap.set(claim.provider_id, existing)
         })
 
         return Array.from(providerMap.values())
           .map(p => ({
             ...p,
             fraudRate: p.totalClaims > 0 ? (p.fraudulentClaims / p.totalClaims) * 100 : 0,
           }))
           .sort((a, b) => b.fraudRate - a.fraudRate)
       } else {
         const result = await query<{
           provider_id: string
           facility_name: string
           facility_code: string
           total_claims: string
           fraudulent_claims: string
         }>(`
           SELECT 
             c.provider_id,
             p.facility_name,
             p.facility_code,
             COUNT(*) as total_claims,
             COUNT(*) FILTER (WHERE c.fraud_label = 'FRAUDULENT') as fraudulent_claims
           FROM claims c
           JOIN providers p ON c.provider_id = p.id
           GROUP BY c.provider_id, p.facility_name, p.facility_code
           ORDER BY (COUNT(*) FILTER (WHERE c.fraud_label = 'FRAUDULENT')::float / NULLIF(COUNT(*), 0)) DESC
         `)
         return result.rows.map(row => ({
           providerId: row.provider_id,
           facilityName: row.facility_name,
           facilityCode: row.facility_code,
           totalClaims: parseInt(row.total_claims, 10),
           fraudulentClaims: parseInt(row.fraudulent_claims, 10),
           fraudRate: parseInt(row.total_claims, 10) > 0 
             ? (parseInt(row.fraudulent_claims, 10) / parseInt(row.total_claims, 10)) * 100 
             : 0,
         }))
       }
     },

    getMemberFraudStats: async () => {
      if (this.mode === 'supabase') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('claims')
          .select(`
            member_id,
            fraud_label,
            members(full_name, member_number)
          `)
        
        const memberMap = new Map<string, {
          memberId: string
          fullName: string
          memberNumber: string
          totalClaims: number
          fraudulentClaims: number
        }>()
          data?.forEach((claim: { member_id: string; fraud_label: string; members: { full_name: string; member_number: string }[] }) => {
    const memberData = claim.members[0] || { full_name: 'Unknown', member_number: 'Unknown' };

          const existing = memberMap.get(claim.member_id) || {
            memberId: claim.member_id,
            fullName: memberData?.full_name || 'Unknown',
            memberNumber: memberData?.member_number || 'Unknown',
            totalClaims: 0,
            fraudulentClaims: 0,
          }
          existing.totalClaims++
          if (claim.fraud_label === 'FRAUDULENT') {
            existing.fraudulentClaims++
          }
          memberMap.set(claim.member_id, existing)
        })

        return Array.from(memberMap.values())
          .map(m => ({
            ...m,
            fraudRate: m.totalClaims > 0 ? (m.fraudulentClaims / m.totalClaims) * 100 : 0,
          }))
          .filter(m => m.fraudulentClaims > 0)
          .sort((a, b) => b.fraudRate - a.fraudRate)
      } else {
        const result = await query<{
          member_id: string
          full_name: string
          member_number: string
          total_claims: string
          fraudulent_claims: string
        }>(`
          SELECT 
            c.member_id,
            m.full_name,
            m.member_number,
            COUNT(*) as total_claims,
            COUNT(*) FILTER (WHERE c.fraud_label = 'FRAUDULENT') as fraudulent_claims
          FROM claims c
          JOIN members m ON c.member_id = m.id
          GROUP BY c.member_id, m.full_name, m.member_number
          HAVING COUNT(*) FILTER (WHERE c.fraud_label = 'FRAUDULENT') > 0
          ORDER BY (COUNT(*) FILTER (WHERE c.fraud_label = 'FRAUDULENT')::float / NULLIF(COUNT(*), 0)) DESC
        `)
        return result.rows.map(row => ({
          memberId: row.member_id,
          fullName: row.full_name,
          memberNumber: row.member_number,
          totalClaims: parseInt(row.total_claims, 10),
          fraudulentClaims: parseInt(row.fraudulent_claims, 10),
          fraudRate: parseInt(row.total_claims, 10) > 0 
            ? (parseInt(row.fraudulent_claims, 10) / parseInt(row.total_claims, 10)) * 100 
            : 0,
        }))
      }
    },
  }

  // ─── Raw query (for custom queries) ──────────────────────────────────────────
  
  async rawQuery<T extends QueryResultRow= Record<string, unknown>>(sql: string, params?: unknown[]) {
    if (this.mode === 'supabase') {
      const supabase = await createClient()
      // Supabase doesn't support raw SQL directly in the JS client
      // You'd need to use a database function or RPC
      throw new Error('Raw SQL queries not supported in Supabase mode. Use RPC or switch to PostgreSQL mode.')
    } else {
      return query<T>(sql, params)
    }
  }

  // ─── Transaction support ─────────────────────────────────────────────────────
  
   async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
     if (this.mode === 'supabase') {
       // Supabase doesn't support transactions in the JS client
       throw new Error('Transactions not supported in Supabase mode. Use PostgreSQL mode for transaction support.')
     } else {
       return pgTransaction(callback)
     }
   }
}

// Export singleton instance
export const db = new DatabaseClient()
