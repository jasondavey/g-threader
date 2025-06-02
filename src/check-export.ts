import * as fs from 'fs-extra';
import * as path from 'path';

async function checkExportFile(filename: string) {
  try {
    console.log(`Checking export file: ${filename}`);
    const filePath = path.join(__dirname, '../exports', filename);
    
    if (!await fs.pathExists(filePath)) {
      console.error('File not found!');
      return;
    }
    
    const data = await fs.readJSON(filePath);
    console.log('Data type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    
    if (typeof data === 'object' && !Array.isArray(data)) {
      console.log('Object keys:', Object.keys(data));
      
      if ('emails' in data) {
        console.log('Found emails array in data object');
        console.log('Emails count:', (data as any).emails.length);
        
        // Check first email structure
        if ((data as any).emails.length > 0) {
          console.log('First email keys:', Object.keys((data as any).emails[0]));
        }
      }
    } else if (Array.isArray(data)) {
      console.log('Array length:', data.length);
      
      // Check first item structure
      if (data.length > 0) {
        console.log('First item keys:', Object.keys(data[0]));
      }
    }
    
  } catch (error) {
    console.error('Error checking export file:', error);
  }
}

// Get all JSON files in exports directory
async function main() {
  try {
    const exportDir = path.join(__dirname, '../exports');
    const files = await fs.readdir(exportDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files in exports directory`);
    
    for (const file of jsonFiles) {
      await checkExportFile(file);
      console.log('-'.repeat(50));
    }
    
  } catch (error) {
    console.error('Error reading exports directory:', error);
  }
}

main();
