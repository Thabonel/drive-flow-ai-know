import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChartAnalysisRequest {
  documentContent: string;
  spreadsheetData?: any;
  requestedChartTypes?: string[];
}

interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  data: any[];
  config: {
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
    colors?: string[];
  };
  description: string;
  confidence: number;
}

interface ChartAnalysisResponse {
  charts: ChartConfiguration[];
  insights: string[];
  dataQuality: {
    completeness: number;
    consistency: number;
    recommendations: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, spreadsheetData, requestedChartTypes }: ChartAnalysisRequest = await req.json();
    
    console.log('Analyzing document for chart opportunities:', { 
      contentLength: documentContent.length,
      hasSpreadsheetData: !!spreadsheetData,
      requestedTypes: requestedChartTypes 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Analyze with AI to identify chartable data patterns
    const analysisPrompt = `
Analyze the following document content and identify opportunities for data visualization:

${documentContent}

${spreadsheetData ? `\nSpreadsheet Data Available:\n${JSON.stringify(spreadsheetData, null, 2)}` : ''}

Please identify:
1. Datasets that can be visualized
2. Appropriate chart types (bar, line, pie, scatter, area)
3. Key insights that charts would reveal
4. Data quality assessment

Focus on practical, actionable visualizations that would help users understand their data better.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a data visualization expert. Analyze documents and suggest optimal chart configurations using Recharts format."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_chart_configurations",
              description: "Generate chart configurations based on data analysis",
              parameters: {
                type: "object",
                properties: {
                  charts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["bar", "line", "pie", "scatter", "area"] },
                        title: { type: "string" },
                        data: { type: "array" },
                        config: {
                          type: "object",
                          properties: {
                            xKey: { type: "string" },
                            yKey: { type: "string" },
                            nameKey: { type: "string" },
                            valueKey: { type: "string" },
                            colors: { type: "array", items: { type: "string" } }
                          }
                        },
                        description: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 }
                      },
                      required: ["type", "title", "data", "config", "description", "confidence"]
                    }
                  },
                  insights: {
                    type: "array",
                    items: { type: "string" }
                  },
                  dataQuality: {
                    type: "object",
                    properties: {
                      completeness: { type: "number", minimum: 0, maximum: 1 },
                      consistency: { type: "number", minimum: 0, maximum: 1 },
                      recommendations: { type: "array", items: { type: "string" } }
                    },
                    required: ["completeness", "consistency", "recommendations"]
                  }
                },
                required: ["charts", "insights", "dataQuality"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_chart_configurations" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI analysis response:', aiResponse);

    // Extract the function call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_chart_configurations") {
      throw new Error("AI did not return expected chart configuration format");
    }

    const chartAnalysis: ChartAnalysisResponse = JSON.parse(toolCall.function.arguments);

    // Enhance with fallback data if spreadsheet data is available
    if (spreadsheetData && chartAnalysis.charts.length === 0) {
      chartAnalysis.charts = generateFallbackCharts(spreadsheetData);
    }

    // Add default colors if not specified
    chartAnalysis.charts = chartAnalysis.charts.map(chart => ({
      ...chart,
      config: {
        ...chart.config,
        colors: chart.config.colors || [
          'hsl(var(--chart-1))',
          'hsl(var(--chart-2))',
          'hsl(var(--chart-3))',
          'hsl(var(--chart-4))',
          'hsl(var(--chart-5))'
        ]
      }
    }));

    return new Response(JSON.stringify(chartAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chart analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Chart analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFallbackCharts(spreadsheetData: any): ChartConfiguration[] {
  const charts: ChartConfiguration[] = [];
  
  if (spreadsheetData.sheets && spreadsheetData.sheets.length > 0) {
    const sheet = spreadsheetData.sheets[0];
    if (sheet.data && sheet.data.length > 0) {
      const keys = Object.keys(sheet.data[0]);
      const numericalKeys = keys.filter(key => 
        sheet.data.every((row: any) => typeof row[key] === 'number' || !isNaN(Number(row[key])))
      );
      const categoricalKeys = keys.filter(key => !numericalKeys.includes(key));
      
      // Create a bar chart if we have categorical and numerical data
      if (categoricalKeys.length > 0 && numericalKeys.length > 0) {
        charts.push({
          type: 'bar',
          title: `${numericalKeys[0]} by ${categoricalKeys[0]}`,
          data: sheet.data,
          config: {
            xKey: categoricalKeys[0],
            yKey: numericalKeys[0]
          },
          description: `Bar chart showing the relationship between ${categoricalKeys[0]} and ${numericalKeys[0]}`,
          confidence: 0.8
        });
      }
      
      // Create a line chart for trend analysis
      if (numericalKeys.length >= 2) {
        charts.push({
          type: 'line',
          title: `Trend Analysis: ${numericalKeys.slice(0, 2).join(' vs ')}`,
          data: sheet.data,
          config: {
            xKey: categoricalKeys[0] || 'index',
            yKey: numericalKeys[0]
          },
          description: `Line chart showing trends in ${numericalKeys[0]} over time`,
          confidence: 0.7
        });
      }
    }
  }
  
  return charts;
}