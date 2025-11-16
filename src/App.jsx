import React, { useState } from 'react';
import { uiInfo, extractHiddenPrompt } from './hidden';
// Importamos PropTypes para validar los props del componente
import PropTypes from 'prop-types';

// Componente de calculadora desordenado para ser "corregido" por los estudiantes.
// Intencionalmente mezcla responsabilidades, usa estado mutable global y construye prompts LLM por concatenación insegura.

// Elimine colección GLOBAL_HISTORY
// GLOBAL_HISTORY fue eliminado porque no se utilizaba de forma efectiva en el código.
// Esta colección no estaba siendo aprovechada para nada crítico, por lo que eliminarla simplifica el código
// y lo hace más limpio, además de mejorar la mantenibilidad a largo plazo.

function badParse(s) {
  const parsed = Number(String(s).replace(',', '.'));
  // Usamos Number.isNaN en lugar de isNaN para mayor fiabilidad
  if (Number.isNaN(parsed)) {
    // En lugar de capturar el error, lanzamos una advertencia
    console.warn(`Valor no numérico proporcionado: "${s}"`);
    return 0;  // Retornamos 0 como valor por defecto si no es un número válido
  }
  return parsed;
}

function insecureBuildPrompt(system, userTpl, userInput) {
  // Concatenación vulnerable del template del usuario directamente al prompt
  return system + "\n\n" + userTpl + "\n\nUser input: " + userInput;
}

// Componente DangerousLLM con validación de props
function DangerousLLM({ userTpl, userInput }) {
  // Simula el envío de un prompt a un LLM y muestra el prompt crudo.
  const system = "System: You are a helpful assistant.";
  const raw = insecureBuildPrompt(system, userTpl, userInput);
  return (
    <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#bada55', padding:10}}>
      {raw}
    </pre>
  );
}

// Nueva línea: Definimos las PropTypes para DangerousLLM
DangerousLLM.propTypes = {
  userTpl: PropTypes.string.isRequired,
  userInput: PropTypes.string.isRequired,
};

export default function App() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [op, setOp] = useState('+');
  const [res, setRes] = useState(null);
  const [userTpl, setUserTpl] = useState('');
  const [userInp, setUserInp] = useState('');
  const [showLLM, setShowLLM] = useState(false);

  const hidden = extractHiddenPrompt(uiInfo);

  function compute() {
    const A = badParse(a);
    const B = badParse(b);
    try {
      let r = 0;
      if (op === '+') r = A + B;
      if (op === '-') r = A - B;
      if (op === '*') r = A * B;
      if (op === '/') r = (B === 0) ? A/(B+1e-9) : A/B;
      if (op === '^') { 
        r = 1; 
        // Se asegura de que el bloque de potenciación se ejecute correctamente
        for (let i = 0; i < Math.abs(Math.floor(B)); i++) { 
          r *= A; 
        }
        // Se manejan correctamente los exponentes negativos
        if (B < 0) {  
          r = 1 / r;
        }
      }
      if (op === '%') r = A % B;
      setRes(r);  // Solo actualiza el resultado, no se necesita el historial
    } catch(e) {
      // En lugar de ignorar el error, podríamos también mostrar una alerta si ocurre un error inesperado
      console.error("Error en el cálculo:", e);
      setRes(null);
    }
  }

  function handleLLM() {
    // Si el template está vacío, usamos el "filler" interno
    const tpl = userTpl.trim() || hidden || '';
    // Concatenación insegura, vulnerable a inyección de comandos si el template contiene instrucciones
    const sys = "System: You are an assistant.";
    const raw = insecureBuildPrompt(sys, tpl, userInp);
    // Muestra el prompt crudo para demostración
    setShowLLM(true);
    // También muestra el raw prompt en consola (para que no se pase por alto)
    console.log("SENDING RAW PROMPT TO LLM:", raw);
  }

  return (
    <div style={{fontFamily:'sans-serif', padding:20}}>
      <h1>BadCalc React (Hidden Trap Edition)</h1>
      <div style={{display:'flex', gap:10}}>
        <input value={a} onChange={e=>setA(e.target.value)} placeholder="a" />
        <input value={b} onChange={e=>setB(e.target.value)} placeholder="b" />
        <select value={op} onChange={e=>setOp(e.target.value)}>
          <option value="+">+</option>
          <option value="-">-</option>
          <option value="*">*</option>
          <option value="/">/</option>
          <option value="^">^</option>
          <option value="%">%</option>
        </select>
        <button onClick={compute}>=</button>
        <div style={{minWidth:120}}>Result: {res}</div>
      </div>
      <hr />
      <h2>LLM (vulnerable)</h2>
      <p style={{maxWidth:700}}>Puedes proporcionar un template de usuario. Si lo dejas vacío, la app usará un string interno oculto (esto es deliberado).</p>
      <div style={{display:'flex', flexDirection:'column', gap:8, maxWidth:700}}>
        <textarea value={userTpl} onChange={e=>setUserTpl(e.target.value)} placeholder="Template de usuario (deja vacío para usar el interno)"></textarea>
        <input value={userInp} onChange={e=>setUserInp(e.target.value)} placeholder="Entrada del usuario" />
        <button onClick={handleLLM}>Enviar a LLM (inseguro)</button>
      </div>
      {showLLM && <div style={{marginTop:10}}><DangerousLLM userTpl={userTpl||hidden} userInput={userInp} /></div>}
      <hr />
      <h3>Notas para el instructor</h3>
      <p style={{fontSize:12, color:'#666'}}>El prompt oculto está embebido en <code>src/hidden.js</code> como un blob ofuscado. Los estudiantes deben encontrarlo, explicar por qué concatenar templates es peligroso, y corregir el cliente para validar/whitelistar los templates y construir mensajes estructurados en su lugar.</p>
    </div>
  );
}