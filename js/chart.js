let chartInstance = null;

export function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

export function renderWeightChart(canvasEl, data, unit) {
  destroyChart();

  if (!window.Chart) return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const tickColor  = isDark ? '#94a3b8' : '#64748b';

  chartInstance = new window.Chart(canvasEl, {
    type: 'line',
    data: {
      datasets: [{
        label: `Weight (${unit})`,
        data,
        borderColor: '#f5c000',
        backgroundColor: 'rgba(245,192,0,0.10)',
        pointBackgroundColor: '#f5c000',
        pointRadius: data.length <= 30 ? 4 : 2,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => {
              const d = new Date(ctx[0].raw.x);
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: ctx => ` ${ctx.raw.y} ${unit}`,
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'day', tooltipFormat: 'PP', displayFormats: { day: 'MMM d' } },
          grid: { color: gridColor },
          ticks: { color: tickColor, maxTicksLimit: 7 },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, callback: v => `${v} ${unit}` },
        }
      }
    }
  });
}

export function updateChartData(data, unit) {
  if (!chartInstance) return;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].label = `Weight (${unit})`;
  chartInstance.data.datasets[0].pointRadius = data.length <= 30 ? 4 : 2;
  chartInstance.options.scales.y.ticks.callback = v => `${v} ${unit}`;
  chartInstance.update();
}
