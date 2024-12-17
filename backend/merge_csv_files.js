const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parser');

const sourceFolder = './contracts/cpvDesignation/';
const outputFolder = './contracts/health/';
const outputFile = 'health-statistics.csv';

async function mergeCsvFiles() {
    // Ensure the output folder exists
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }

    const files = fs.readdirSync(sourceFolder).filter(file => file.endsWith('.csv'));
    const outputFilePath = path.join(outputFolder, outputFile);

    let isFirstFile = true;
    let writeStream = fs.createWriteStream(outputFilePath);

    for (const file of files) {
        const filePath = path.join(sourceFolder, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const [header, ...dataRows] = fileContent.split('\n');

        if (isFirstFile) {
            writeStream.write(header + '\n'); // Write header from the first file
            isFirstFile = false;
        }

        writeStream.write(dataRows.join('\n').trim() + '\n'); // Write rows
    }

    writeStream.end();
    console.log(`Merged CSV saved to ${outputFilePath}`);
}

// Execute the merging function
mergeCsvFiles().catch(err => console.error('Error merging CSV files:', err));
