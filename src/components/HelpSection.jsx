export function HelpSection({ server }) {
  return (
    <section id="ayuda" className="section">
      <div className="section-heading">
        <p className="eyebrow">Uso responsable</p>
        <h2>Cómo funciona</h2>
      </div>
      <ol className="steps">
        <li>Pega el enlace del video que tienes autorización para guardar.</li>
        <li>Pulsa Analizar video. Clipora valida la URL e identifica la plataforma.</li>
        <li>Si el enlace es compatible, verás miniatura, título, duración y calidades reales.</li>
        <li>Elige la resolución del video o cambia a solo audio para escoger formato y bitrate.</li>
        <li>El servidor usa yt-dlp y FFmpeg para obtener, combinar o convertir el archivo; puedes cancelar el proceso.</li>
        <li>Al terminar, el navegador guarda el archivo con la extensión correspondiente.</li>
      </ol>
      <div className="notice">
        <p>
          Clipora no simula descargas. Si YouTube, Facebook, TikTok o X no permiten extraer un video concreto, verás un
          error explicativo en lugar de un botón que no hace nada.
        </p>
      </div>
      <div className="notice">
        <p>
          Descarga únicamente contenido que te pertenezca, que sea de dominio público o para el que tengas permiso.
          Respetar las condiciones de cada plataforma es tu responsabilidad.
        </p>
        <p>
          Motor: {server?.hasYtDlp ? 'yt-dlp listo' : 'yt-dlp no detectado'}. FFmpeg:{' '}
          {server?.hasFfmpeg ? 'disponible' : 'no disponible (menos formatos combinados)'}.
        </p>
      </div>
    </section>
  )
}
