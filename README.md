# web-semantic-owl-rdf
owl/rdf approach for monopoly detection in public contracts


## Backend

### csv to turtle
```bash
npm install csv-parser
```

```bash
npm install papaparse
```

```bash
node merge_csv_files.js
```

```bash
node convert_statistics_to_rdf.js
```

### apache jena

Download Apache Jena Fuseki 5.2.0.zip
https://jena.apache.org/download/index.cgi

Install openjdk 17
```bash
sudo apt-get install openjdk-17-jdk
```

```bash
./backend/apache-jena-fuseki-5.2.0/fuseki-server
```

### SPARQL

PREFIX ex: <http://example.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?publicEntityName ?contractualPrice ?contractType ?otherCompanyName
WHERE {
  ?pe rdf:type ex:PublicEntity .
  ?contract rdf:type ex:Contract .
  ?otherCompany rdf:type ex:OtherCompany .

  ?pe ex:HAS_LEGAL_TENDER ?contract .
  ?contract ex:ASSOCIATED_WITH ?otherCompany .

  ?pe ex:name ?publicEntityName .
  ?contract ex:hasContractualPrice ?contractualPrice .
  ?contract ex:hasContractType ?contractType .
  ?otherCompany ex:name ?otherCompanyName .

  ?contract ex:hasCPVDesignation ?cpvDesignation .
  FILTER CONTAINS(?cpvDesignation, "Produtos")
}
LIMIT 200
