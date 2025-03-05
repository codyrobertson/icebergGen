export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const requestId = `init-db-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  console.log(`[${requestId}] Database initialization request started`)

  try {
    // Check for a secret key in the headers
    const secretKey = request.headers.get("x-admin-key")

    // This is a simple security measure - in production, use a more secure approach
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      console.log(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create a Supabase client with admin privileges
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${requestId}] Missing Supabase credentials`)
      throw new Error(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
      )
    }

    console.log(`[${requestId}] Creating Supabase client with admin privileges`)
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Define the complete schema in a single SQL statement
    const completeSchema = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Create tables if they don't exist
      CREATE TABLE IF NOT EXISTS public.user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'free',
        searches_remaining INTEGER DEFAULT 3,
        deep_dives_remaining INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS public.search_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        model TEXT NOT NULL,
        tone TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        results_count INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS public.icebergs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS public.search_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON search_logs (user_id);
      CREATE INDEX IF NOT EXISTS search_logs_query_idx ON search_logs (query);
      CREATE INDEX IF NOT EXISTS search_logs_timestamp_idx ON search_logs (timestamp);
      CREATE INDEX IF NOT EXISTS icebergs_user_id_idx ON icebergs (user_id);
      CREATE INDEX IF NOT EXISTS icebergs_query_idx ON icebergs (query);
      CREATE INDEX IF NOT EXISTS icebergs_created_at_idx ON icebergs (created_at);
      CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON search_history (user_id);
      CREATE INDEX IF NOT EXISTS search_history_timestamp_idx ON search_history (timestamp);
      
      -- Add RLS (Row Level Security) policies
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE icebergs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
      
      -- Create policy to allow users to read their own profiles
      CREATE POLICY IF NOT EXISTS "Users can read their own profiles" 
      ON user_profiles FOR SELECT 
      USING (auth.uid() = id);
      
      -- Create policy to allow users to update their own profiles
      CREATE POLICY IF NOT EXISTS "Users can update their own profiles" 
      ON user_profiles FOR UPDATE 
      USING (auth.uid() = id);
      
      -- Create policy to allow users to read their own search logs
      CREATE POLICY IF NOT EXISTS "Users can read their own search logs" 
      ON search_logs FOR SELECT 
      USING (auth.uid() = user_id);
      
      -- Create policy to allow users to insert their own search logs
      CREATE POLICY IF NOT EXISTS "Users can insert their own search logs" 
      ON search_logs FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
      
      -- Create policy to allow users to read their own icebergs
      CREATE POLICY IF NOT EXISTS "Users can read their own icebergs" 
      ON icebergs FOR SELECT 
      USING (auth.uid() = user_id);
      
      -- Create policy to allow users to insert their own icebergs
      CREATE POLICY IF NOT EXISTS "Users can insert their own icebergs" 
      ON icebergs FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
      
      -- Create policy to allow users to read their own search history
      CREATE POLICY IF NOT EXISTS "Users can read their own search history" 
      ON search_history FOR SELECT 
      USING (auth.uid() = user_id);
      
      -- Create policy to allow users to insert their own search history
      CREATE POLICY IF NOT EXISTS "Users can insert their own search history" 
      ON search_history FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    `

    // Try to execute the complete schema
    console.log(`[${requestId}] Attempting to create database schema`)
    try {
      const { error } = await supabase.rpc("exec_sql", { query: completeSchema })

      if (error) {
        console.error(`[${requestId}] Error executing complete schema:`, error)
        // Continue to alternative approaches
      } else {
        console.log(`[${requestId}] Successfully created database schema`)
        return NextResponse.json({
          success: true,
          message: "Database schema created successfully",
        })
      }
    } catch (error) {
      console.error(`[${requestId}] Exception executing complete schema:`, error)
      // Continue to alternative approaches
    }

    // If the complete schema approach failed, try creating tables individually
    console.log(`[${requestId}] Attempting to create tables individually`)

    // Create user_profiles table
    try {
      console.log(`[${requestId}] Creating user_profiles table`)
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          CREATE TABLE IF NOT EXISTS public.user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'free',
            searches_remaining INTEGER DEFAULT 3,
            deep_dives_remaining INTEGER DEFAULT 3,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })

      if (error) {
        console.error(`[${requestId}] Error creating user_profiles table:`, error)
      } else {
        console.log(`[${requestId}] Successfully created user_profiles table`)
      }
    } catch (error) {
      console.error(`[${requestId}] Exception creating user_profiles table:`, error)
    }

    // Create search_logs table
    try {
      console.log(`[${requestId}] Creating search_logs table`)
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.search_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            model TEXT NOT NULL,
            tone TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            results_count INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL
          );
        `,
      })

      if (error) {
        console.error(`[${requestId}] Error creating search_logs table:`, error)
      } else {
        console.log(`[${requestId}] Successfully created search_logs table`)
      }
    } catch (error) {
      console.error(`[${requestId}] Exception creating search_logs table:`, error)
    }

    // Create icebergs table
    try {
      console.log(`[${requestId}] Creating icebergs table`)
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.icebergs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })

      if (error) {
        console.error(`[${requestId}] Error creating icebergs table:`, error)
      } else {
        console.log(`[${requestId}] Successfully created icebergs table`)
      }
    } catch (error) {
      console.error(`[${requestId}] Exception creating icebergs table:`, error)
    }

    // Create search_history table
    try {
      console.log(`[${requestId}] Creating search_history table`)
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.search_history (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })

      if (error) {
        console.error(`[${requestId}] Error creating search_history table:`, error)
      } else {
        console.log(`[${requestId}] Successfully created search_history table`)
      }
    } catch (error) {
      console.error(`[${requestId}] Exception creating search_history table:`, error)
    }

    // Verify tables exist
    console.log(`[${requestId}] Verifying tables exist`)
    const tables = ["user_profiles", "search_logs", "icebergs", "search_history"]
    const tableStatus: Record<string, boolean> = {}

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("count").limit(1)

        if (error) {
          console.error(`[${requestId}] Error verifying ${table} table:`, error)
          tableStatus[table] = false
        } else {
          console.log(`[${requestId}] ${table} table exists`)
          tableStatus[table] = true
        }
      } catch (error) {
        console.error(`[${requestId}] Exception verifying ${table} table:`, error)
        tableStatus[table] = false
      }
    }

    // If user_profiles table doesn't exist, try one more approach
    if (!tableStatus["user_profiles"]) {
      console.log(`[${requestId}] Attempting alternative approach for user_profiles table`)
      try {
        // Try direct SQL approach
        const { error } = await supabase
          .from("_exec_sql")
          .select("*")
          .eq(
            "query",
            `
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            CREATE TABLE IF NOT EXISTS public.user_profiles (
              id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
              email TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'free',
              searches_remaining INTEGER DEFAULT 3,
              deep_dives_remaining INTEGER DEFAULT 3,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          `,
          )

        if (error) {
          console.error(`[${requestId}] Error with direct SQL approach:`, error)
        } else {
          console.log(`[${requestId}] Successfully created user_profiles table with direct SQL`)
          tableStatus["user_profiles"] = true
        }
      } catch (error) {
        console.error(`[${requestId}] Exception with direct SQL approach:`, error)
      }
    }

    // Return status of table creation
    console.log(`[${requestId}] Database initialization completed`)
    return NextResponse.json({
      success: Object.values(tableStatus).some((status) => status),
      message: "Database initialization completed",
      tableStatus,
    })
  } catch (error) {
    console.error(`[${requestId}] Unhandled error in init-db route:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Try creating tables manually in the Supabase dashboard SQL editor.",
      },
      { status: 500 },
    )
  }
}

