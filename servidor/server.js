

// Importamos el framework Express para manejar rutas y solicitudes HTTP
const express = require('express'); 

// Importamos body-parser para analizar los cuerpos de las solicitudes HTTP
const bodyParser = require('body-parser');

const cors = require('cors'); // Middleware para habilitar solicitudes HTTP desde diferentes dominios (Cross-Origin Resource Sharing).

const axios = require('axios'); // Librería para realizar solicitudes HTTP, como consultas a APIs externas.

// Importamos DOMParser para parsear respuestas XML
const { DOMParser } = require('xmldom'); // Clase para analizar y manipular datos XML en JavaScript.

// Importamos mssql para conectarnos a la base de datos SQL Server
const sql = require('mssql'); 

require('dotenv').config(); // Librería para cargar variables de entorno desde un archivo `.env`.


// Configuración de la base de datos utilizando variables de entorno
const dbConfig = {
  server: process.env.DB_SERVER, // Dirección del servidor SQL
  database: process.env.DB_DATABASE, // Nombre de la base de datos
  user: process.env.DB_USER, // Usuario de la base de datos
  password: process.env.DB_PASSWORD, // Contraseña del usuario
  options: {
    encrypt: true, // Activa la encriptación de la conexión
    trustServerCertificate: true, // Permite conexiones locales sin certificado
  },
};

// Función para probar la conexión a la base de datos
async function testConnection() {
  try {
    const pool = await sql.connect(dbConfig); // Intenta conectarse a la base de datos
    console.log('Conexión exitosa a la base de datos'); // Mensaje en caso de éxito
    await pool.close(); // Cierra la conexión para evitar fugas de recursos
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message); // Mensaje en caso de error
  }
}

testConnection();
//----------------------------------------------------------------------------------------------

// Inicializamos la aplicación Express
const app = express();
const PORT = 5000; // Puerto en el que se ejecutará el servidor

// Variables globales para almacenar el token y la firma
const currentToken = process.env.CURRENTTOKEN; // Token de autenticación (obtenido previamente)
const currentSign = process.env.CURRENTSIGN; // Firma asociada al token

// Configuración de middleware para la aplicación
app.use(cors()); // Habilita CORS para permitir solicitudes desde otros dominios
app.use(bodyParser.json()); // Permite procesar cuerpos de solicitud en formato JSON

// Función para guardar la auditoría de los datos en la base de datos
// Función asincrónica para guardar la auditoría de las consultas realizadas en la base de datos

///////////////////////////////////////////////////////////////////////////////////////////////////
async function guardarAudit(cuit, resultado) {
  try {
    // Conexión a la base de datos utilizando la configuración especificada en `dbConfig`
    const pool = await sql.connect(dbConfig);

    // Configuración de la consulta SQL con parámetros dinámicos
    await pool.request()
      // Se agrega el CUIT como un parámetro de tipo `VarChar` 
      .input('cuit', sql.VarChar, cuit) 
      // Se convierte el objeto `resultado` en un string JSON para almacenarlo como texto en la base de datos
      .input('resultado', sql.NVarChar, JSON.stringify(resultado)) 
      // Se agrega la fecha y hora actual como parámetro, utilizando el tipo de dato `DateTime`
      .input('fecha', sql.DateTime, new Date()) 
      // Consulta SQL que inserta los datos en la tabla `AuditoriaConsultas`
      .query('INSERT INTO AuditoriaConsultas (CUIT, Resultado, FechaConsulta) VALUES (@cuit, @resultado, @fecha)');
    
    // Si la operación fue exitosa, muestra un mensaje en la consola
    console.log('Auditoría guardada correctamente en la base de datos.');

    // Cierra la conexión al pool de la base de datos para liberar recursos
    pool.close();
  } catch (error) {
    // En caso de que ocurra un error durante la operación, lo captura y muestra un mensaje en la consola
    console.error('Error al guardar la auditoría en la base de datos:', error.message);
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Endpoint para consultar un CUIT
app.post('/api/consultar-cuit', async (req, res) => {
  // Extrae el CUIT del cuerpo de la solicitud
  const { cuit } = req.body; 

  try {
    // Crear una solicitud SOAP en formato XML para consultar datos en el servicio de AFIP
    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a5="http://a5.soap.ws.server.puc.sr/">
        <soapenv:Header/> <!-- Encabezado vacío requerido por SOAP -->
        <soapenv:Body> <!-- Cuerpo de la solicitud SOAP -->
          <a5:getPersona_v2>
            <token>${currentToken}</token> <!-- Token de autenticación actual -->
            <sign>${currentSign}</sign> <!-- Firma de autenticación actual -->
            <cuitRepresentada>20144969724</cuitRepresentada> <!-- CUIT de la empresa que realiza la consulta -->
            <idPersona>${cuit}</idPersona> <!-- CUIT de la persona o entidad a consultar -->
          </a5:getPersona_v2>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // Enviar la solicitud SOAP al servicio web de AFIP utilizando Axios
    const response = await axios.post(
      'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5', // URL del servicio AFIP
      soapRequest, // Solicitud SOAP creada anteriormente
      {
        headers: {
          'Content-Type': 'text/xml', // Especifica que el contenido es XML
          SOAPAction: '', // Encabezado obligatorio para solicitudes SOAP (vacío en este caso)
        },
      }
    );

    // Parsear la respuesta XML recibida de AFIP para extraer datos relevantes
    const parser = new DOMParser(); // Instancia de DOMParser para trabajar con XML
    const xmlDoc = parser.parseFromString(response.data, 'text/xml'); // Convierte la respuesta XML en un documento manipulable

    // Extraer información específica del XML, como nombre, apellido, dirección, etc.
    const nombre = xmlDoc.getElementsByTagName('nombre')[0]?.textContent || 'Desconocido'; // Nombre de la persona
    const apellido = xmlDoc.getElementsByTagName('apellido')[0]?.textContent || 'Desconocido'; // Apellido de la persona
    const direccion = xmlDoc.getElementsByTagName('direccion')[0]?.textContent || 'Desconocido'; // Dirección de la persona
    const tipoPersona = xmlDoc.getElementsByTagName('tipoPersona')[0]?.textContent || 'Desconocido'; // Tipo de persona (física o jurídica)
    const estadoClave = xmlDoc.getElementsByTagName('estadoClave')[0]?.textContent || 'Desconocido'; // Estado de la clave fiscal
    const descripcionProvincia = xmlDoc.getElementsByTagName('descripcionProvincia')[0]?.textContent || 'Desconocido'; // Provincia de residencia

    // Crear un objeto que contiene todos los datos extraídos
    const resultado = { nombre, apellido, direccion, tipoPersona, estadoClave, descripcionProvincia };

    // Llama a la función `guardarAudit` para guardar los datos de la consulta en la base de datos
    await guardarAudit(cuit, resultado);

    // Envía el resultado como respuesta al cliente
    res.json(resultado);

    // Muestra en la consola del servidor el resultado obtenido
    console.log('Respuesta:', resultado);
  } catch (error) {
    // Manejo de errores: muestra un mensaje en la consola en caso de fallo
    console.error('Error al consumir la API de AFIP:', error.message);

    // Envía una respuesta de error al cliente
    res.status(500).json({ error: 'Error al consultar los datos en AFIP.' });
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Iniciar el servidor en el puerto especificado
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
