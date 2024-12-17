const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

// File paths
const inputFilePath = path.join(__dirname, 'contracts/health/health-statistics.csv');
const outputFilePath = path.join(__dirname, 'contracts/health/health-statistics.ttl');

// Prefixes for Turtle
const prefixes = `
@prefix : <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

`;

// Utility function to escape string literals for Turtle
const escapeTurtleString = (str) => {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\') // Escape backslashes
              .replace(/"/g, '\\"')   // Escape quotes
              .replace(/\n/g, '\\n')  // Escape newlines
              .replace(/\r/g, '\\r'); // Escape carriage returns
};

// Read CSV and convert to Turtle
const convertCsvToTurtle = async () => {
    const turtleStatements = [prefixes];
    const companies = [];
    const groupsByCpv = {};

    fs.createReadStream(inputFilePath)
        .pipe(
            csvParser({
                mapHeaders: ({ header }) => header.trim(),
                mapValues: ({ value }) => value ? value.replace(/\"\"\"/g, '"').trim() : '',
            })
        )
        .on('data', (row) => {
            try {
                if (!row.otherCompanyName) {
                    console.warn('Skipping row with missing company name:', row);
                    return;
                }
        
                const companyId = row.otherCompanyName.match(/\((\d+)\)/)?.[1] || 'unknown';
                const companyName = row.otherCompanyName.replace(/\"/g, '').trim();
                const resourceURI = `<http://example.org/company/${companyId}>`;
        
                // Helper function to clean values
                const cleanValue = (value) => value?.replace(/\"/g, '').replace(/,/g, '.').trim() || '';
                
                // Add RDF triples for the company
                turtleStatements.push(`
        ${resourceURI} a :Company ;
            :companyName "${companyName}" ;
            :cpvDesignation "${cleanValue(row.cpvDesignation)}" ;
            :totalCpvValueNormalizedFormatted "${cleanValue(row.totalCpvValueNormalizedFormatted)}"^^xsd:decimal ;
            :contractsCount ${cleanValue(row.contractsCount)} ;
            :publicEntitiesCount ${cleanValue(row.publicEntitiesCount)} ;
            :totalCpvValueFormatted "${cleanValue(row.totalCpvValueFormatted)}" ;
            :distanceAvgCpvValueNormalizedFormatted "${cleanValue(row.distanceAvgCpvValueNormalizedFormatted)}"^^xsd:decimal ;
            :distanceStdCpvValueNormalizedFormatted "${cleanValue(row.distanceStdCpvValueNormalizedFormatted)}"^^xsd:decimal ;
            :distanceGlobalCpvValueNormalizedFormatted "${cleanValue(row.distanceGlobalCpvValueNormalizedFormatted)}"^^xsd:decimal ;
            :marketShareCpvValueNormalizedFormatted "${cleanValue(row.marketShareCpvValueNormalizedFormatted)}" ;
            :distanceGlobalContractsCount ${cleanValue(row.distanceGlobalContractsCount)} ;
            :marketShareContractsCountFormatted "${cleanValue(row.marketShareContractsCountFormatted)}" ;
            :distanceGlobalPublicEntitiesCount ${cleanValue(row.distanceGlobalPublicEntitiesCount)} ;
            :marketSharePublicEntitiesCountFormatted "${cleanValue(row.marketSharePublicEntitiesCountFormatted)}" .
        `);
            } catch (error) {
                console.error('Error processing row:', row, error);
            }
        })
        .on('end', () => {
            // Generate unique relationships within the same cpvDesignation group
            Object.keys(groupsByCpv).forEach((cpv) => {
                const group = groupsByCpv[cpv];
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        turtleStatements.push(`${group[i]} :competesWith ${group[j]} .`);
                    }
                }
            });

            // Write Turtle statements to the output file
            fs.writeFileSync(outputFilePath, turtleStatements.join('\n').trim(), 'utf-8');
            console.log(`Turtle file with relationships generated at: ${outputFilePath}`);
        })
        .on('error', (error) => {
            console.error('Error reading the CSV file:', error);
        });
};

convertCsvToTurtle();
