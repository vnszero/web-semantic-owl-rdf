const fs = require('fs');
const csvParser = require('csv-parser');

// Prefixos RDF
const prefix = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
`;

const output = [];

// Função para validar e limpar dados
function cleanData(value) {
  if (!value) return 'N/A'; // Valor padrão para dados vazios
  return value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''); // Limpar espaços e caracteres especiais
}

fs.createReadStream('contracts/health/output.csv')
  .pipe(csvParser({ separator: ';' }))
  .on('data', (row) => {
    const contractURI = `ex:Contract_${cleanData(row['Objeto do Contrato'])}`;
    const publicEntityURI = `ex:PublicEntity_${cleanData(row['Entidade(s) Adjudicante(s)'])}`;
    const otherCompanyURI = `ex:OtherCompany_${cleanData(row['Entidade(s) Adjudicatária(s)'])}`;

    // Validar dados necessários
    if (!row['Objeto do Contrato'] || !row['Entidade(s) Adjudicante(s)'] || !row['Entidade(s) Adjudicatária(s)']) {
      console.log(`Dados ausentes na linha: ${JSON.stringify(row)}`);
      return; // Pular linha com dados faltando
    }

    // Adicionar a classe PublicEntity
    output.push(`
${publicEntityURI} rdf:type ex:PublicEntity ;
  ex:name "${row['Entidade(s) Adjudicante(s)']}" .
`);

    // Adicionar a classe OtherCompany
    output.push(`
${otherCompanyURI} rdf:type ex:OtherCompany ;
  ex:name "${row['Entidade(s) Adjudicatária(s)']}" .
`);

    // Adicionar a classe Contract e suas relações
    output.push(`
${contractURI} rdf:type ex:Contract ;
  ex:hasProcedureType "${row['Tipo de Procedimento'] || 'N/A'}" ;
  ex:hasContractType "${row['Tipo(s) de Contrato'] || 'N/A'}" ;
  ex:hasCPV "${row['CPV'] || 'N/A'}" ;
  ex:hasCPVDesignation "${row['CPV Designação'] || 'N/A'}" ;
  ex:hasContractualPrice "${row['Preço Contratual'] || '0'}" ;
  ex:hasPublicationDate "${row['Data de Publicação'] || 'N/A'}" ;
  ex:hasCelebrationDate "${row['Data de Celebração do Contrato'] || 'N/A'}" ;
  ex:hasExecutionDeadline "${row['Prazo de Execução'] || 'N/A'}" ;
  ex:hasExecutionLocation "${row['Local de Execução'] || 'N/A'}" .
  
${publicEntityURI} ex:HAS_LEGAL_TENDER ${contractURI} .
${contractURI} ex:ASSOCIATED_WITH ${otherCompanyURI} .
`);
  })
  .on('end', () => {
    fs.writeFileSync('contracts/health/output.ttl', prefix + output.join('\n'));
    console.log('RDF file generated: output.ttl');
  })
  .on('error', (err) => {
    console.error('Erro ao processar o arquivo CSV:', err);
  });
