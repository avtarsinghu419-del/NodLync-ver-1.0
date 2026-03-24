export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel p-5 h-28 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface/50"></div>
              <div className="h-4 bg-surface/50 rounded w-24"></div>
            </div>
            <div className="h-8 bg-surface/50 rounded w-16 mt-4"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="space-y-6 xl:col-span-5">
          {/* Active Projects Skeleton */}
          <div className="glass-panel p-5 h-64 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/3"></div>
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface/50 rounded-lg"></div>
              ))}
            </div>
          </div>
          {/* Upcoming Tasks Skeleton */}
          <div className="glass-panel p-5 h-64 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/3"></div>
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface/50 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="glass-panel p-5 h-48 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/3"></div>
            <div className="h-32 bg-surface/50 rounded-lg"></div>
          </div>
          <div className="glass-panel p-5 h-64 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/3"></div>
            <div className="h-48 bg-surface/50 rounded-lg"></div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-3">
          <div className="glass-panel p-5 h-40 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/2"></div>
            <div className="flex-1 bg-surface/50 rounded-lg"></div>
          </div>
          <div className="glass-panel p-5 h-40 flex flex-col gap-4">
            <div className="h-5 bg-surface/50 rounded w-1/2"></div>
            <div className="flex-1 bg-surface/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
