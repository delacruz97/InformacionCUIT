import React, { useState } from 'react';
import axios from 'axios'; // Para realizar solicitudes HTTP
import jsPDF from 'jspdf'; // Para generar archivos PDF
import html2canvas from 'html2canvas'; // Para capturar contenido HTML como imágenes

function App() {

  const [cuit, setCuit] = useState(''); // Almacena el CUIT ingresado por el usuario
  const [datos, setDatos] = useState(null); // Almacena los datos recibidos del servidor
  const [error, setError] = useState(''); // Almacena mensajes de error

  
  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    setError(''); // Limpia cualquier error previo
    setDatos(null); // Limpia los datos previos

    try {
      // Realiza una solicitud POST al servidor con el CUIT ingresado
      const response = await axios.post('http://localhost:5000/api/consultar-cuit', { cuit });
      setDatos(response.data); // Guarda la respuesta del servidor en el estado 'datos'
    } catch (err) {
      // Maneja errores y los muestra en pantalla
      setError(err.response?.data?.error || 'Error al realizar la consulta.');
    }
  };

  // Genera un PDF con los datos del contribuyente
  const generatePDF = () => {
    const content = document.getElementById('datosContribuyente'); // Captura el div que contiene los datos
    html2canvas(content).then((canvas) => {
      const imgData = canvas.toDataURL('image/png'); // Convierte el contenido a imagen
      const pdf = new jsPDF(); // Crea un nuevo archivo PDF
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 0); // Agrega la imagen al PDF
      pdf.save('datos_contribuyente.pdf'); // Descarga el PDF con el nombre especificado
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
     
      <text style={{ backgroundColor: 'pink', borderRadius: 5, width: '100%', height: 20, textAlign: 'center' }}>
        Desafío propuesto por <strong>InterSistemas</strong>
      </text>

      {/* Contenedor del formulario */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1>Consulta de CUIT</h1>

        {/* Formulario para ingresar el CUIT */}
        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'center', marginBottom: '-10px' }}>
            <label htmlFor="cuit">Ingresa el CUIT:</label>
          </div>
          <br />
          <input
            type="text"
            id="cuit"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)} // Actualiza el estado 'cuit'
            placeholder="12345678901"
            style={{ padding: '8px', width: '300px', marginBottom: '10px', textAlign: 'center' }}
          />
          <br />
          <div style={{ width: '100%', height: '30px', textAlign: 'center' }}>
            <button
              type="submit"
              style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '15px' }}
            >
              Consultar
            </button>
          </div>
        </form>
      </div>

      {/* Mensaje de error si ocurre un problema */}
      {error && (
        <p
          style={{
            backgroundColor: '#ffe0dc',
            color: 'red',
            marginTop: '10px',
            width: '400px',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}

      {/* Datos del contribuyente */}
      {datos && (
        <>
          <div
            id="datosContribuyente" // ID necesario para capturar este div
            style={{
              marginTop: '40px',
              padding: '20px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: '#e0f4ea',
              width: '400px',
            }}
          >
            <h2>Datos del Contribuyente</h2>
            <p>
              <strong>Nombre:</strong> {datos.nombre}
            </p>
            <p>
              <strong>Apellido:</strong> {datos.apellido}
            </p>
            <p>
              <strong>Dirección:</strong> {datos.direccion}
            </p>
            <p>
              <strong>Provincia:</strong> {datos.descripcionProvincia}
            </p>
            <p>
              <strong>Persona:</strong> {datos.tipoPersona}
            </p>
            <p>
              <strong>Estado:</strong> {datos.estadoClave}
            </p>
          </div>

          {/* Botón para descargar el PDF */}
          <div style={{ width: '100%', textAlign: 'center' }}>
            <button
              onClick={generatePDF}
              style={{
                padding: '10px 20px',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                marginTop: '10px',
              }}
            >
              Descargar PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
