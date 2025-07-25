import * as XLSX from 'xlsx';
import { z } from 'zod';

const AgentMetricImportSchema = z.object({
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
  service: z.number().min(0).max(5),
  productivity: z.number().min(0).max(5),
  quality: z.number().min(0).max(5),
  assiduity: z.number().min(0).max(5),
  performance: z.number().min(0).max(5),
  adherence: z.number().min(0).max(5),
  lateness: z.number().min(0).max(5),
  breakExceeds: z.number().min(0).max(5),
});

export class ExcelService {
  static async parseMetricsFile(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const validatedData = [];
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      try {
        const validated = AgentMetricImportSchema.parse(data[i]);
        validatedData.push(validated);
      } catch (error) {
        errors.push({
          row: i + 2,
          error: error instanceof z.ZodError ? error.issues : 'Invalid data'
        });
      }
    }
    
    return { data: validatedData, errors };
  }
  
  static generateMetricsTemplate() {
    const template = [
      {
        employeeId: 'EMP001',
        month: 1,
        year: 2025,
        service: 4.5,
        productivity: 4.0,
        quality: 4.2,
        assiduity: 5.0,
        performance: 4.3,
        adherence: 4.8,
        lateness: 4.5,
        breakExceeds: 4.7,
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metrics Template');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
  
  static async exportMetrics(metrics: Record<string, unknown>[]) {
    const worksheet = XLSX.utils.json_to_sheet(metrics);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent Metrics');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}