[Supabase] ✅ Initializing with URL: https://xaqztozcnkpmgytnnjlj.supabase.co...
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14533  [expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.
addListener @ entry-423bfff0e657c60fe3a02c834f4bdb11.js:14533
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 0 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Web platform - checking browser notification support
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13376 [OrganizationContext] Fetching stored organization from AsyncStorage...
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 Starting auth initialization...
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 [UserContext] Loading auth data...
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13416 License type loaded: OPS (default)
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13376 [OrganizationContext] Loaded org: Admin Organization id: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 [UserContext] Auth data loaded: Object
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Browser notification permission: granted
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 0 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 0 rolesLoading: true rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Web platform - checking browser notification support
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Fetching roles for org: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Browser notification permission: granted
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 0 rolesLoading: true rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Web platform - checking browser notification support
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13288 [useNotifications] Fetched 104 notifications
entry-423bfff0e657c60fe3a02c834f4bdb11.js:14526 [PushNotifications] Browser notification permission: granted
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Raw data from Supabase: [
  {
    "id": "3c6af4d1-91e9-48bc-a2b3-1d66bb29389c",
    "organization_id": "74ce281d-5630-422d-8326-e5d36cfc1d5e",
    "name": "Maintenance Admin",
    "description": "Full administrative access",
    "permissions": [
      {
        "module": "inventory",
        "actions": [
          "view",
          "create",
          "edit",
          "delete",
          "adjust_quantity",
          "export",
          "import",
          "manage_settings"
        ]
      },
      {
        "module": "procurement",
        "actions": [
          "view",
          "create",
          "edit",
          "delete",
          "export",
          "approve"
        ]
      },
      {
        "module": "approvals",
        "actions": [
          "view",
          "create",
          "approve",
          "reject",
          "export"
        ]
      },
      {
        "module": "employees",
        "actions": [
          "view"
        ]
      },
      {
        "module": "reports",
        "actions": [
          "view"
        ]
      },
      {
        "module": "vendors",
        "actions": [
          "view",
          "create",
          "edit",
          "delete",
          "export"
        ]
      },
      {
        "module": "work_orders",
        "actions": [
          "view",
          "create",
          "edit",
          "delete",
          "assign",
          "adjust_time",
          "export"
        ]
      },
      {
        "module": "preventive_maintenance",
        "actions": [
          "view",
          "create",
          "edit",
          "delete",
          "assign",
          "export"
        ]
      },
      {
        "module": "finance_ap",
        "actions": [
          "view"
        ]
      },
      {
        "module": "finance_gl",
        "actions": [
          "view"
        ]
      },
      {
        "module": "budgeting",
        "actions": [
          "view"
        ]
      },
      {
        "module": "task_feed",
        "actions": [
          "view",
          "create"
        ]
      },
      {
        "module": "recycling",
        "actions": [
          "view",
          "create"
        ]
      },
      {
        "module": "portal",
        "actions": [
          "view",
          "create",
          "edit",
          "manage_settings"
        ]
      },
      {
        "module": "lms",
        "actions": [
          "view"
        ]
      },
      {
        "module": "quality",
        "actions": [
          "view"
        ]
      },
      {
        "module": "safety",
        "actions": [
          "view"
        ]
      }
    ],
    "is_system": true,
    "created_at": "2026-01-24T01:42:11.168409+00:00",
    "updated_at": "2026-01-25T01:13:16.777+00:00",
    "color": "#3B82F6",
    "created_by": null
  },
  {
    "id": "4c36da7d-4c74-48c5-bdb8-8010c647bce3",
    "organization_id": "74ce281d-5630-422d-8326-e5d36cfc1d5e",
    "name": "Maintenance Manager",
    "description": "Oversees all maintenance operations, manages technicians, controls MRO budget, sets PM schedules, ensures equipment reliability and compliance with safety/regulatory requirements.",
    "permissions": [
      {
        "module": "inventory",
        "actions": [
          "view"
        ]
      },
      {
        "module": "work_orders",
        "actions": [
          "view",
          "create",
          "edit",
          "assign",
          "adjust_time",
          "export"
        ]
      },
      {
        "module": "preventive_maintenance",
        "actions": [
          "view",
          "export",
          "assign"
        ]
      },
      {
        "module": "procurement",
        "actions": [
          "view",
          "approve",
          "reject",
          "export"
        ]
      },
      {
        "module": "approvals",
        "actions": [
          "view",
          "create",
          "approve"
        ]
      },
      {
        "module": "reports",
        "actions": [
          "view"
        ]
      },
      {
        "module": "vendors",
        "actions": [
          "view",
          "create",
          "edit"
        ]
      },
      {
        "module": "budgeting",
        "actions": [
          "view"
        ]
      },
      {
        "module": "inspections",
        "actions": [
          "view"
        ]
      },
      {
        "module": "task_feed",
        "actions": [
          "create",
          "view",
          "verify"
        ]
      },
      {
        "module": "recycling",
        "actions": [
          "view",
          "create"
        ]
      },
      {
        "module": "portal",
        "actions": [
          "view",
          "create",
          "edit"
        ]
      },
      {
        "module": "lms",
        "actions": [
          "assign",
          "view"
        ]
      }
    ],
    "is_system": true,
    "created_at": "2026-01-24T01:42:11.168409+00:00",
    "updated_at": "2026-02-01T04:11:36.943+00:00",
    "color": "#3B82F6",
    "created_by": null
  },
 
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Fetched 8 roles for org 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13376 [Organization] Fetched facilities: 4
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useEmployeeRoles] Fetched 6 employee role assignments
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13288 [useNotifications] Fetched 104 notifications
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 Auth data loaded successfully
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 Auth initialization complete, setting loading to false
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13389 [useRoles] Hook called, organizationId: 74ce281d-5630-422d-8326-e5d36cfc1d5e
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13388 [PermissionsContext] supabaseRoles: 8 rolesLoading: false rolesError: null
entry-423bfff0e657c60fe3a02c834f4bdb11.js:266  Cannot record touch end without a touch start.
 Touch End: {"identifier":0,"pageX":355,"pageY":380,"timestamp":1194.5}
 Touch Bank: []
h @ entry-423bfff0e657c60fe3a02c834f4bdb11.js:266
entry-423bfff0e657c60fe3a02c834f4bdb11.js:13377 Auth timeout - forcing loading to false
[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
