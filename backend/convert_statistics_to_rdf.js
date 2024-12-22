const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const Papa = require('papaparse');

// Function to clear and convert formatted numbers
const convertToNumber = (formattedNumber) => {
    // Remove duble quotes and comma
    const cleanNumber = formattedNumber.replace(/"/g, '').replace(/,/g, '');
    return cleanNumber;
};

// Function to clear and convert formatted numbers to percentages
const convertToPercentage = (percentageString) => {
    return parseFloat(percentageString.replace('%', '').replace(/"/g, ''));
};

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
                const rawDesignation = row.cpvDesignation.toLowerCase().replace(/ /g, '-').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/á/g, 'a').replace(/ã/g, 'a').replace(/é/g, 'e').replace(/ó/g, 'o').replace(/"/g, '')
                const resourceURI = `<http://example.org/company/${rawDesignation}/${companyId}>`;
        
                // Helper function to clean values
                const cleanValue = (value) => value?.replace(/\"/g, '').trim() || '';
                
                // Add RDF triples for the company
                turtleStatements.push(`
        ${resourceURI} a :Company ;
            :companyName "${companyName}" ;
            :cpvDesignation "${cleanValue(row.cpvDesignation)}" ;
            :totalCpvValueNormalizedFormatted ${convertToNumber(cleanValue(row.totalCpvValueNormalizedFormatted))} ;
            :contractsCount ${convertToNumber(cleanValue(row.contractsCount))} ;
            :publicEntitiesCount ${convertToNumber(cleanValue(row.publicEntitiesCount))} ;
            :totalCpvValueFormatted ${convertToNumber(cleanValue(row.totalCpvValueFormatted))} ;
            :distanceAvgCpvValueNormalizedFormatted ${convertToNumber(cleanValue(row.distanceAvgCpvValueNormalizedFormatted))} ;
            :distanceStdCpvValueNormalizedFormatted ${convertToNumber(cleanValue(row.distanceStdCpvValueNormalizedFormatted))} ;
            :distanceGlobalCpvValueNormalizedFormatted ${convertToNumber(cleanValue(row.distanceGlobalCpvValueNormalizedFormatted))} ;
            :marketShareCpvValueNormalizedFormatted ${convertToPercentage(cleanValue(row.marketShareCpvValueNormalizedFormatted))} ;
            :distanceGlobalContractsCount ${convertToNumber(cleanValue(row.distanceGlobalContractsCount))} ;
            :marketShareContractsCountFormatted ${convertToPercentage(cleanValue(row.marketShareContractsCountFormatted))} ;
            :distanceGlobalPublicEntitiesCount ${convertToNumber(cleanValue(row.distanceGlobalPublicEntitiesCount))} ;
            :marketSharePublicEntitiesCountFormatted ${convertToPercentage(cleanValue(row.marketSharePublicEntitiesCountFormatted))} .
        `);
        
                // Group companies by cpvDesignation for relationships
                const cpv = cleanValue(row.cpvDesignation);
                if (cpv) {
                    if (!groupsByCpv[cpv]) {
                        groupsByCpv[cpv] = [];
                    }
                    groupsByCpv[cpv].push(resourceURI);
                }
        
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
