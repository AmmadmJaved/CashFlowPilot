import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export default function PWAInstallBanner() {
  const { showInstallBanner, install, dismissInstallBanner, canInstall } = usePWA();

  if (!showInstallBanner || !canInstall) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-in shadow-xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                Install ExpenseShare
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Get the full app experience with offline access and quick launch
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissInstallBanner}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={dismissInstallBanner}
            className="text-gray-600 hover:text-gray-800"
          >
            Not now
          </Button>
          <Button
            onClick={install}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PWAInstallButton() {
  const { canInstall, install, isStandalone } = usePWA();

  if (!canInstall || isStandalone) {
    return null;
  }

  return (
    <Button
      onClick={install}
      variant="outline"
      size="sm"
      className="hidden sm:flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
    >
      <Download className="w-4 h-4" />
      <span>Install App</span>
    </Button>
  );
}