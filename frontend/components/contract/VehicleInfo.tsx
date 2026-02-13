import { Vehicle } from "@/types";
import { Car, Calendar, Fuel, Settings } from "lucide-react";

interface VehicleInfoProps {
  vehicle: Vehicle;
}

export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Car className="w-5 h-5 text-primary" />
        Vehicle Information
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Make & Model</span>
          <span className="text-sm font-semibold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </div>

        {vehicle.trim && (
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Trim</span>
            <span className="text-sm font-semibold">{vehicle.trim}</span>
          </div>
        )}

        {vehicle.vin && (
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">VIN</span>
            <span className="text-sm font-mono">{vehicle.vin}</span>
          </div>
        )}

        {vehicle.fuelType && (
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Fuel className="w-4 h-4" />
              Fuel Type
            </span>
            <span className="text-sm font-semibold">{vehicle.fuelType}</span>
          </div>
        )}

        {vehicle.drivetrain && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Drivetrain
            </span>
            <span className="text-sm font-semibold">{vehicle.drivetrain}</span>
          </div>
        )}
      </div>
    </div>
  );
}