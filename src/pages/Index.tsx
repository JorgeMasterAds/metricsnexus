import { Activity } from "lucide-react";

const Index = () => {
  return (
    <div className="dark">
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <Activity className="h-10 w-10 text-destructive-foreground" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Nexus Metrics
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Sua central de métricas inteligentes
          </p>
        </div>
      </main>
    </div>);

};

export default Index;