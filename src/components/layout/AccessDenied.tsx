import { FiLock } from "react-icons/fi";

export function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <FiLock className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">પરવાનગી નથી (Access Restricted)</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        તમને આ પેજ જોવાની પરવાનગી નથી. પરવાનગી માટે તમારા Super Admin નો સંપર્ક કરો.
        (You don&apos;t have permission to view this page. Contact your Super Admin to request access.)
      </p>
    </div>
  );
}
