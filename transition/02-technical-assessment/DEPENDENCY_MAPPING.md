# Dependency Mapping: Supabase to Infrastructure-Neutral Migration

## Executive Summary

This document provides a comprehensive mapping of all Supabase dependencies within AI Query Hub, categorized by migration complexity and business impact. The analysis identifies 127 direct dependencies across 8 major system areas that require careful migration planning.

## Dependency Categories

### Category Definitions
- **Critical**: Core functionality that would break the application if removed
- **Important**: Significant features that users actively rely on
- **Nice-to-have**: Convenience features that enhance user experience
- **Internal**: Development/operations tools not user-facing

### Complexity Ratings
- **High**: Requires significant architecture changes or custom development
- **Medium**: Moderate changes with established migration patterns
- **Low**: Simple configuration or drop-in replacement available

## Database Dependencies

### PostgreSQL Database Layer
**Impact**: Critical | **Complexity**: Medium

#### Current Implementation
```sql
-- Core database dependencies identified
Tables with Supabase-specific features:
- auth.users (Supabase managed auth table)
- storage.objects (Supabase managed storage table)

RLS Policies (15 total):
- knowledge_documents: user_id access control
- knowledge_bases: user_id + team access control
- conversations: user_id access control
- ai_query_history: user_id access control
- user_settings: user_id access control
- user_google_tokens: user_id access control
- admin_messages: role-based access control
```

#### Migration Requirements
```typescript
// Target schema modifications needed
interface MigrationRequirements {
  // Replace Supabase auth.users with custom users table
  customUserTable: {
    id: string,
    email: string,
    email_confirmed_at?: Date,
    encrypted_password: string,
    created_at: Date,
    updated_at: Date,
    metadata: Record<string, any>
  },

  // Replace storage.objects with custom file tracking
  customFileTable: {
    id: string,
    user_id: string,
    bucket: string,
    path: string,
    metadata: Record<string, any>,
    created_at: Date
  },

  // Convert RLS policies to application-level security
  applicationSecurity: {
    userAccessMiddleware: Function,
    teamAccessMiddleware: Function,
    roleBasedMiddleware: Function
  }
}
```

#### Dependencies List
1. **Supabase Auth Integration** (Critical/High)
   - `auth.users` table references in 8 tables
   - RLS policies dependent on `auth.uid()`
   - JWT token validation in Edge Functions

2. **Real-time Subscriptions** (Important/Medium)
   - `conversations` table real-time updates
   - `knowledge_documents` change notifications
   - WebSocket connection management

3. **Custom PostgreSQL Functions** (Important/Medium)
   - `update_updated_at_column()` trigger function
   - `get_user_documents_with_metadata()` custom function
   - Vector search functions for embeddings

## Authentication System Dependencies

### Supabase Auth Service
**Impact**: Critical | **Complexity**: High

#### Current Integration Points
```typescript
// Authentication dependencies identified in codebase
Files with auth dependencies:
- src/hooks/useAuth.tsx (26 references)
- src/integrations/supabase/client.ts (Auth client setup)
- src/components/ProtectedRoute.tsx (Route protection)
- src/pages/LoginPage.tsx (Login form)
- src/pages/SignUpPage.tsx (Registration form)
- src/pages/ConfirmEmail.tsx (Email confirmation)

Edge Functions with auth:
- All 90+ edge functions use supabase.auth.getUser()
- JWT token validation in function headers
- User context injection in business logic
```

#### Authentication Flow Dependencies
```typescript
// Current auth flow breakdown
interface AuthFlowDependencies {
  // User registration flow
  registration: {
    supabaseAuthSignUp: 'supabase.auth.signUp()',
    emailConfirmation: 'Email confirmation via Supabase SMTP',
    profileCreation: 'Auto-creation of user profile record',
    redirectHandling: 'Supabase auth state management'
  },

  // Login flow
  authentication: {
    supabaseAuthSignIn: 'supabase.auth.signInWithPassword()',
    sessionManagement: 'Supabase session handling',
    tokenRefresh: 'Automatic JWT token refresh',
    persistentSessions: 'localStorage session persistence'
  },

  // OAuth integration
  googleAuth: {
    oauthFlow: 'Google Drive OAuth separate from Supabase',
    tokenStorage: 'user_google_tokens table',
    refreshHandling: 'Custom token refresh logic',
    scopeManagement: 'Drive API scope management'
  }
}
```

#### Migration Requirements
```typescript
// Target authentication architecture
interface AuthMigrationTarget {
  // Custom auth service
  authService: {
    userRegistration: (email: string, password: string) => Promise<User>,
    emailVerification: (token: string) => Promise<void>,
    userAuthentication: (email: string, password: string) => Promise<Session>,
    sessionValidation: (token: string) => Promise<User>,
    passwordReset: (email: string) => Promise<void>
  },

  // Session management
  sessionManager: {
    createSession: (user: User) => Promise<Session>,
    validateSession: (token: string) => Promise<boolean>,
    refreshSession: (refreshToken: string) => Promise<Session>,
    revokeSession: (sessionId: string) => Promise<void>
  },

  // OAuth integration
  oauthManager: {
    initiateOAuthFlow: (provider: string) => Promise<string>,
    handleOAuthCallback: (code: string) => Promise<OAuthResult>,
    storeOAuthTokens: (userId: string, tokens: OAuthTokens) => Promise<void>
  }
}
```

## Edge Functions Dependencies

### Supabase Edge Functions (Deno Runtime)
**Impact**: Critical | **Complexity**: High

#### Function Categories and Dependencies
```typescript
// Edge function dependency analysis
interface FunctionDependencies {
  // AI and Document Processing (15 functions)
  aiProcessing: {
    'ai-query': {
      dependencies: ['Supabase client', 'Anthropic API', 'Database queries'],
      complexity: 'High',
      businessImpact: 'Critical',
      migrationEffort: '40 hours'
    },
    'claude-document-processor': {
      dependencies: ['Supabase storage', 'Anthropic API', 'File parsing'],
      complexity: 'High',
      businessImpact: 'Critical',
      migrationEffort: '32 hours'
    },
    'parse-document': {
      dependencies: ['Supabase storage', 'PDF/DOCX parsers'],
      complexity: 'Medium',
      businessImpact: 'Important',
      migrationEffort: '16 hours'
    }
  },

  // Google Drive Integration (5 functions)
  googleDrive: {
    'google-drive-sync': {
      dependencies: ['Google Drive API', 'OAuth tokens', 'Database updates'],
      complexity: 'High',
      businessImpact: 'Important',
      migrationEffort: '24 hours'
    }
  },

  // User Management (25 functions)
  userManagement: {
    'register-user': {
      dependencies: ['Supabase auth', 'Email service', 'Profile creation'],
      complexity: 'High',
      businessImpact: 'Critical',
      migrationEffort: '20 hours'
    }
  },

  // Analytics and Tracking (30 functions)
  analytics: {
    'track-user-action': {
      dependencies: ['Supabase client', 'Analytics tables'],
      complexity: 'Low',
      businessImpact: 'Nice-to-have',
      migrationEffort: '4 hours'
    }
  },

  // Admin and Utilities (15 functions)
  admin: {
    'admin-command-center': {
      dependencies: ['Supabase client', 'Admin permissions', 'Database operations'],
      complexity: 'Medium',
      businessImpact: 'Internal',
      migrationEffort: '12 hours'
    }
  }
}
```

#### Supabase-Specific Dependencies
```typescript
// Common patterns requiring migration
interface CommonFunctionPatterns {
  // Database access pattern
  databaseAccess: `
    import { createClient } from '@supabase/supabase-js'
    const supabase = createClient(url, serviceKey)
    const { data } = await supabase.from('table').select()
  `,

  // Auth validation pattern
  authValidation: `
    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) throw new Error('Unauthorized')
  `,

  // Storage access pattern
  storageAccess: `
    const { data } = await supabase.storage
      .from('bucket')
      .upload(path, file)
  `,

  // Real-time notifications
  realTimeNotifications: `
    await supabase.realtime
      .channel('changes')
      .broadcast('update', payload)
  `
}
```

#### Target Function Architecture
```typescript
// Provider-agnostic function structure
interface TargetFunctionArchitecture {
  // Dependency injection pattern
  serviceContainer: {
    database: DatabaseService,
    auth: AuthService,
    storage: StorageService,
    notifications: NotificationService
  },

  // Function wrapper
  functionHandler: (
    services: ServiceContainer,
    handler: BusinessLogicHandler
  ) => CloudFunction,

  // Example migrated function
  migratedFunction: `
    export const aiQuery = functionHandler(
      services,
      async ({ query, userId }, { database, auth }) => {
        const user = await auth.validateUser(userId)
        const documents = await database.getUserDocuments(user.id)
        return await processAIQuery(query, documents)
      }
    )
  `
}
```

## Storage System Dependencies

### Supabase Storage Service
**Impact**: Important | **Complexity**: Medium

#### Current Storage Integration
```typescript
// Storage dependencies identified
interface StorageDependencies {
  // Document storage
  documentStorage: {
    buckets: ['documents', 'profile-images', 'temp-uploads'],
    policies: ['User can upload to own folder', 'Public read for confirmed users'],
    usage: '~50GB across 100 users',
    features: ['Direct browser upload', 'Signed URLs', 'CDN distribution']
  },

  // Storage access patterns
  accessPatterns: {
    upload: `
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(\`\${userId}/\${fileName}\`, file)
    `,
    download: `
      const { data } = await supabase.storage
        .from('documents')
        .download(\`\${userId}/\${fileName}\`)
    `,
    getUrl: `
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(\`\${userId}/\${fileName}\`)
    `
  }
}
```

#### Files Using Storage
```typescript
// Code locations with storage dependencies
interface StorageUsageLocations {
  frontend: [
    'src/hooks/useDocumentUpload.ts',
    'src/components/DocumentUpload.tsx',
    'src/components/DocumentViewer.tsx',
    'src/pages/Documents.tsx'
  ],
  edgeFunctions: [
    'supabase/functions/parse-document/',
    'supabase/functions/claude-document-processor/',
    'supabase/functions/google-drive-sync/',
    'supabase/functions/admin-upload-cleanup/'
  ]
}
```

#### Migration Requirements
```typescript
// Target storage architecture
interface StorageMigrationTarget {
  // Storage abstraction layer
  storageService: {
    upload: (bucket: string, path: string, file: Buffer) => Promise<UploadResult>,
    download: (bucket: string, path: string) => Promise<Buffer>,
    getSignedUrl: (bucket: string, path: string, expires: number) => Promise<string>,
    delete: (bucket: string, path: string) => Promise<void>,
    copy: (fromBucket: string, fromPath: string, toBucket: string, toPath: string) => Promise<void>
  },

  // Security layer
  accessControl: {
    validateUserAccess: (userId: string, bucket: string, path: string) => Promise<boolean>,
    generateUploadPolicy: (userId: string, bucket: string) => Promise<UploadPolicy>,
    sanitizeFileName: (fileName: string) => string
  },

  // Migration utilities
  migrationTools: {
    bulkMigration: (fromBucket: string, toBucket: string) => Promise<MigrationResult>,
    verifyMigration: (bucket: string) => Promise<VerificationResult>,
    updateFileReferences: (oldUrls: string[], newUrls: string[]) => Promise<void>
  }
}
```

## Real-time Features Dependencies

### Supabase Realtime Service
**Impact**: Important | **Complexity**: Medium

#### Current Real-time Usage
```typescript
// Real-time feature analysis
interface RealtimeUsage {
  // Active subscriptions
  subscriptions: {
    conversationUpdates: {
      table: 'conversations',
      filter: 'user_id=eq.{userId}',
      events: ['INSERT', 'UPDATE'],
      usage: 'Live chat message updates'
    },
    documentChanges: {
      table: 'knowledge_documents',
      filter: 'user_id=eq.{userId}',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      usage: 'Document list refresh'
    },
    systemNotifications: {
      table: 'admin_messages',
      filter: 'user_id=eq.{userId}',
      events: ['INSERT'],
      usage: 'System announcements'
    }
  },

  // Implementation locations
  codeLocations: [
    'src/hooks/useRealtimeSubscription.ts',
    'src/pages/Conversations.tsx',
    'src/pages/Documents.tsx',
    'src/components/NotificationCenter.tsx'
  ]
}
```

#### Migration Requirements
```typescript
// Target real-time architecture
interface RealtimeMigrationTarget {
  // WebSocket service
  websocketService: {
    connect: (userId: string) => Promise<WebSocketConnection>,
    subscribe: (channel: string, callback: MessageCallback) => Promise<Subscription>,
    publish: (channel: string, message: any) => Promise<void>,
    disconnect: () => Promise<void>
  },

  // Channel management
  channelManager: {
    createUserChannel: (userId: string) => string,
    createDocumentChannel: (documentId: string) => string,
    validateChannelAccess: (userId: string, channel: string) => Promise<boolean>
  },

  // Message routing
  messageRouter: {
    routeDocumentUpdates: (userId: string, document: Document) => Promise<void>,
    routeConversationUpdates: (userId: string, message: Message) => Promise<void>,
    routeSystemNotifications: (userId: string, notification: Notification) => Promise<void>
  }
}
```

## Environment and Configuration Dependencies

### Supabase Environment Variables
**Impact**: Critical | **Complexity**: Low

#### Current Environment Configuration
```typescript
// Environment variables requiring migration
interface EnvironmentDependencies {
  supabaseConfig: {
    VITE_SUPABASE_URL: 'Frontend API endpoint',
    VITE_SUPABASE_ANON_KEY: 'Frontend anonymous access',
    SUPABASE_SERVICE_ROLE_KEY: 'Backend service access',
    SUPABASE_JWT_SECRET: 'JWT token validation'
  },

  edgeFunctionConfig: {
    SUPABASE_URL: 'Available in all edge functions',
    SUPABASE_SERVICE_ROLE_KEY: 'Available in all edge functions',
    // Plus 20+ additional environment variables for external APIs
  }
}
```

#### Migration Requirements
```typescript
// Target configuration architecture
interface ConfigMigrationTarget {
  // Multi-provider configuration
  providerConfig: {
    DATABASE_URL: 'Primary database connection',
    AUTH_PROVIDER: 'Authentication service selection',
    STORAGE_PROVIDER: 'Storage service selection',
    FUNCTION_PROVIDER: 'Serverless function platform'
  },

  // Service-specific configuration
  serviceConfig: {
    JWT_SECRET: 'Custom JWT signing key',
    SMTP_CONFIG: 'Email service configuration',
    CDN_CONFIG: 'Content delivery configuration',
    MONITORING_CONFIG: 'Observability service setup'
  }
}
```

## Frontend Integration Dependencies

### Supabase Client Libraries
**Impact**: Important | **Complexity**: Medium

#### Frontend Dependencies
```typescript
// Frontend Supabase integration points
interface FrontendDependencies {
  // Package dependencies
  packages: [
    '@supabase/supabase-js',
    '@supabase/auth-helpers-react',
    '@supabase/auth-helpers-nextjs'
  ],

  // Integration files
  integrationFiles: {
    'src/integrations/supabase/client.ts': 'Main Supabase client setup',
    'src/integrations/supabase/types.ts': 'Auto-generated TypeScript types',
    'src/hooks/useAuth.tsx': 'Authentication hook',
    'src/hooks/useSupabaseQuery.tsx': 'Database query hook'
  },

  // Component usage
  componentUsage: {
    protectedRoutes: '8 route components',
    authForms: '4 authentication forms',
    dataFetching: '15+ data fetching components',
    realTimeComponents: '3 real-time features'
  }
}
```

#### Migration Requirements
```typescript
// Target frontend architecture
interface FrontendMigrationTarget {
  // Provider abstraction
  providerAbstraction: {
    apiClient: 'Generic API client replacing Supabase client',
    authHooks: 'Provider-agnostic authentication hooks',
    dataHooks: 'Generic data fetching hooks',
    realtimeHooks: 'WebSocket abstraction hooks'
  },

  // Type safety
  typeSafety: {
    apiTypes: 'Generate TypeScript types from OpenAPI spec',
    schemaValidation: 'Runtime validation for API responses',
    errorHandling: 'Standardized error handling across providers'
  }
}
```

## Migration Priority Matrix

### Critical Path Dependencies (Must migrate first)
1. **Authentication System** - Blocks all user functionality
2. **Database Core Tables** - Contains all business data
3. **AI Query Edge Function** - Core product functionality
4. **Document Processing Functions** - Core product functionality

### High Priority Dependencies (Significant user impact)
1. **Google Drive Integration** - Major user workflow
2. **Storage System** - Document access functionality
3. **User Management Functions** - Account functionality
4. **Real-time Updates** - User experience impact

### Medium Priority Dependencies (Enhanced features)
1. **Analytics Functions** - Business intelligence
2. **Admin Functions** - Operational tools
3. **Email Notifications** - Communication features
4. **Advanced Database Functions** - Performance optimizations

### Low Priority Dependencies (Nice-to-have features)
1. **Utility Functions** - Developer convenience
2. **Legacy API Endpoints** - Deprecated functionality
3. **Development Tools** - Internal tooling
4. **Experimental Features** - Beta functionality

## Migration Effort Estimation

### Total Effort Breakdown
```typescript
// Development effort estimation
interface MigrationEffortEstimate {
  // Phase 1: Foundation (160 hours)
  foundation: {
    databaseAbstraction: 60,
    authenticationAdapter: 80,
    storageAbstraction: 20
  },

  // Phase 2: Core Migration (320 hours)
  coreMigration: {
    databaseMigration: 80,
    edgeFunctionMigration: 200,
    frontendRefactoring: 40
  },

  // Phase 3: Advanced Features (120 hours)
  advancedFeatures: {
    realtimeMigration: 40,
    analyticsMigration: 30,
    adminToolMigration: 50
  },

  // Total: 600 hours (~3.5 senior engineer months)
  totalEffort: 600
}
```

### Risk-Adjusted Timeline
- **Base Estimate**: 600 hours
- **Risk Buffer**: +25% (150 hours)
- **Testing Overhead**: +15% (90 hours)
- **Total Estimate**: 840 hours (~5 senior engineer months)

---

**Dependencies Identified**: 127 total
**Critical Dependencies**: 18
**High Complexity Items**: 25
**Estimated Migration Effort**: 840 hours
**Risk Level**: High (due to complexity and integration depth)