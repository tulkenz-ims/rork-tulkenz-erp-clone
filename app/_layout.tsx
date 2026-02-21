import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { PushNotificationsProvider } from "@/contexts/PushNotificationsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import EmergencyAlertOverlay from "@/components/EmergencyAlertOverlay";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
      <Stack.Screen 
        name="sds" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <UserProvider>
            <OrganizationProvider>
              <AuthProvider>
                <PermissionsProvider>
                  <LicenseProvider>
                    <NotificationsProvider>
                      <PushNotificationsProvider>
                        <RealtimeProvider>
                         <RootLayoutNav />
                         <EmergencyAlertOverlay />
                        </RealtimeProvider>
                      </PushNotificationsProvider>
                     </NotificationsProvider>
                 </LicenseProvider>
               </PermissionsProvider>
             </AuthProvider>
           </OrganizationProvider>
         </UserProvider>
       </ThemeProvider>
     </GestureHandlerRootView>
   </QueryClientProvider>
  );
}
