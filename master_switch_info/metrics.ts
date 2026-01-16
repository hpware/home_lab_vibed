import { register, Gauge, Counter, collectDefaultMetrics } from "prom-client";
import type { SwitchData } from "./scraper.ts";

export class MetricsServer {
  private port: number;
  private server: any;

  // Metrics
  private portConnectionStatus: Gauge<string>;
  private portMaxSpeed: Gauge<string>;
  private portPacketSpeed: Gauge<string>;
  private systemUptime: Gauge<string>;
  private scrapeSuccess: Counter<string>;
  private scrapeErrors: Counter<string>;
  private lastScrapeTime: Gauge<string>;

  constructor(port: number) {
    this.port = port;
    // Port metrics
    this.portConnectionStatus = new Gauge({
      name: "switch_port_connection_status",
      help: "Port connection status (1 = connected, 0 = disconnected)",
      labelNames: ["port", "status"],
    });

    this.portMaxSpeed = new Gauge({
      name: "switch_port_max_speed_mbps",
      help: "Port maximum connection speed in Mbps",
      labelNames: ["port"],
    });

    this.portPacketSpeed = new Gauge({
      name: "switch_port_packet_speed_mbps",
      help: "Port packet sending speed in Mbps",
      labelNames: ["port"],
    });

    // System metrics
    this.systemUptime = new Gauge({
      name: "switch_system_uptime_seconds",
      help: "System uptime in seconds",
      labelNames: ["ip"],
    });

    // Scrape metrics
    this.scrapeSuccess = new Counter({
      name: "switch_scrape_success_total",
      help: "Total number of successful scrapes",
    });

    this.scrapeErrors = new Counter({
      name: "switch_scrape_errors_total",
      help: "Total number of failed scrapes",
    });

    this.lastScrapeTime = new Gauge({
      name: "switch_last_scrape_timestamp_seconds",
      help: "Timestamp of the last successful scrape",
    });
  }

  updateMetrics(data: SwitchData): void {
    try {
      // Update port metrics
      for (const port of data.ports) {
        const portLabel = port.port.toString();

        // Connection status (1 = connected, 0 = disconnected)
        const isConnected = port.maxConnectionSpeed !== "断开" ? 1 : 0;
        this.portConnectionStatus.set(
          { port: portLabel, status: port.connectionStatus },
          isConnected,
        );

        // Parse max speed (e.g., "1000M全双工" -> 1000)
        const speedMatch = port.maxConnectionSpeed.match(/(\d+)M?/);
        if (speedMatch) {
          this.portMaxSpeed.set({ port: portLabel }, parseInt(speedMatch[1]));
        }

        // Parse packet speed
        const packetSpeedMatch = port.packetSendSpeed.match(/(\d+\.?\d*)/);
        if (packetSpeedMatch) {
          this.portPacketSpeed.set(
            { port: portLabel },
            parseFloat(packetSpeedMatch[1]),
          );
        }
      }

      // Update system metrics
      this.systemUptime.set({ ip: data.system.ip }, data.system.uptimeSeconds);

      // Update scrape metrics
      this.scrapeSuccess.inc();
      this.lastScrapeTime.set(data.timestamp / 1000);

      console.log("Metrics updated successfully");
    } catch (error) {
      console.error("Error updating metrics:", error);
      this.scrapeErrors.inc();
    }
  }

  recordError(): void {
    this.scrapeErrors.inc();
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = Bun.serve({
        port: this.port,
        fetch: async (req) => {
          const url = new URL(req.url);

          if (url.pathname === "/metrics") {
            const metrics = await register.metrics();
            return new Response(metrics, {
              headers: { "Content-Type": register.contentType },
            });
          }

          if (url.pathname === "/health" || url.pathname === "/") {
            return new Response(
              JSON.stringify({
                status: "ok",
                message: "Switch Exporter is running",
              }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          return new Response("Not Found", { status: 404 });
        },
      });

      console.log(`Metrics server listening on http://localhost:${this.port}`);
      console.log(`Metrics available at http://localhost:${this.port}/metrics`);
      resolve();
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
    }
  }
}
