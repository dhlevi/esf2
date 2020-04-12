# esf2
Prototype for esf restful service and service agents

Requires nodejs 10+, mongodb 3.3+, minio latest, and elasticsearch latest.

To install and test:

Install mongodb

Create a db called 'esf'
create a collection called 'agents'
create a collection called 'submissions'

Install minio
Install elasticsearch (optionally ELK stack if you want kibana for managing/searching)

In the esf/example folder: npm install

To run, execute node index.js in esf and example agent.