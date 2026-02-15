// frontend/components/contract/VehicleInfo.tsx
import { Car, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  engine?: string;
  drivetrain?: string;
  fuelType?: string;
  colorExt?: string;
  colorInt?: string;
  odometerMiles?: number;
}

interface VehicleInfoProps {
  vehicle: Vehicle | null | undefined;
}

export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  // Check if vehicle exists and has meaningful data (not just VIN)
  const hasVehicleData = vehicle && (
    vehicle.make || 
    vehicle.model || 
    vehicle.year
  );

  // No vehicle data at all
  if (!vehicle) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Vehicle Information</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
          <div className="p-3 bg-muted rounded-full">
            <AlertTriangle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No vehicle information available
          </p>
        </div>
      </div>
    );
  }

  // VIN exists but no other data (invalid VIN)
  if (!hasVehicleData && vehicle.vin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Vehicle Information</h2>
        </div>

        {/* VIN Display */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">VIN</p>
          <p className="font-mono text-sm">{vehicle.vin}</p>
        </div>

        {/* Warning Message */}
        <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center bg-yellow-500/5 rounded-lg border border-yellow-500/20">
          <div className="p-3 bg-yellow-500/10 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="font-medium text-sm">VIN Not Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              This VIN may not exist in the database
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Has vehicle data - show all available fields
  const vehicleFields = [
    { label: "Make", value: vehicle.make, icon: "🚗" },
    { label: "Model", value: vehicle.model, icon: "📝" },
    { label: "Year", value: vehicle.year, icon: "📅" },
    { label: "Trim", value: vehicle.trim, icon: "✨" },
    { label: "Body Class", value: vehicle.bodyClass, icon: "🚙" },
    { label: "Engine", value: vehicle.engine, icon: "⚙️" },
    { label: "Drivetrain", value: vehicle.drivetrain, icon: "🔧" },
    { label: "Fuel Type", value: vehicle.fuelType, icon: "⛽" },
    { label: "Exterior Color", value: vehicle.colorExt, icon: "🎨" },
    { label: "Interior Color", value: vehicle.colorInt, icon: "🪑" },
    { 
      label: "Odometer", 
      value: vehicle.odometerMiles ? `${vehicle.odometerMiles.toLocaleString()} miles` : null, 
      icon: "📊" 
    },
  ].filter(field => field.value); // Only show fields with values

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Vehicle Information</h2>
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          Verified
        </Badge>
      </div>

      {/* VIN */}
      {vehicle.vin && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">VIN</p>
          <p className="font-mono text-sm font-medium">{vehicle.vin}</p>
        </div>
      )}

      {/* Vehicle Fields Grid */}
      <div className="space-y-3">
        {vehicleFields.map((field, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{field.icon}</span>
              <span className="text-sm text-muted-foreground">{field.label}</span>
            </div>
            <span className="text-sm font-medium text-right">{field.value}</span>
          </div>
        ))}
      </div>

      {/* Data Quality Indicator */}
      <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span>{vehicleFields.length} fields available</span>
      </div>
    </div>
  );
}