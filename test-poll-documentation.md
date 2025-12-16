# 📊 Documentación de Prueba de Encuestas - WhatsApp Web JS

## 🚀 Función de Prueba Completa para Encuestas (Polls)

Esta documentación describe la función `testPollFeature` agregada al archivo `example.js` para probar todas las características de encuestas disponibles en whatsapp-web.js.

## 📋 Comandos Disponibles

### 1. `!testpoll`
Ejecuta una prueba completa de encuestas enviando 5 tipos diferentes:

1. **Encuesta de opción única**: Lenguajes de programación favoritos
2. **Encuesta de opción múltiple**: Frameworks de JavaScript utilizados
3. **Encuesta con ID personalizado**: Experiencia con WhatsApp Web JS
4. **Encuesta con emojis**: Satisfacción con el bot (usando estrellas ⭐)
5. **Encuesta contextual**: Adaptada según el tipo de chat (grupo o privado)

**Uso opcional**: `!testpoll [chatId]` - Envía una encuesta adicional al chat especificado

### 2. `!pollresults`
Muestra un resumen completo de todos los votos registrados:
- Total de votantes por encuesta
- Distribución de votos por opción
- Porcentajes y gráfico de barras visual
- ID parcial de cada encuesta

### 3. `!clearpollresults`
Limpia todos los resultados de encuestas almacenados en memoria.

### 4. `!sendpoll` (comando existente)
Envía encuestas básicas de ejemplo (ya estaba en el código original).

## 🔧 Características Implementadas

### Registro Automático de Votos
El evento `vote_update` ha sido mejorado para:
- Registrar cada voto recibido con el ID del votante
- Actualizar cuando un usuario cambia su voto
- Eliminar registros cuando un usuario retira su voto
- Mostrar estadísticas en tiempo real en la consola
- Mantener un conteo actualizado por opción

### Estructura de Datos
```javascript
pollResults = {
  [pollId]: {
    [voterId]: [array de opciones seleccionadas]
  }
}
```

### Tipos de Encuestas Soportadas

1. **Opción Única** (`allowMultipleAnswers: false`)
   - Los usuarios solo pueden seleccionar una opción
   - Ideal para decisiones binarias o preferencias exclusivas

2. **Opción Múltiple** (`allowMultipleAnswers: true`)
   - Los usuarios pueden seleccionar varias opciones
   - Útil para recopilar múltiples preferencias

3. **Con ID Personalizado** (`messageSecret`)
   - Permite identificar encuestas de forma única
   - Array de 32 números únicos

## 📊 Ejemplo de Uso

```bash
# 1. Ejecutar la prueba completa
> !testpoll

# 2. Esperar a que los usuarios voten...

# 3. Ver resultados
> !pollresults

# 4. Limpiar resultados cuando sea necesario
> !clearpollresults

# 5. Enviar encuesta a un chat específico
> !testpoll 593984958499@c.us
```

## 🎯 Casos de Uso

1. **Encuestas de Decisión Grupal**: Para coordinar reuniones, eventos o decisiones
2. **Feedback y Satisfacción**: Recopilar opiniones sobre servicios o productos
3. **Votaciones**: Elecciones democráticas en grupos
4. **Preferencias**: Conocer gustos y preferencias de la comunidad
5. **Estadísticas**: Recopilar datos para análisis

## ⚠️ Limitaciones

- WhatsApp permite máximo 12 opciones por encuesta
- Cada opción puede tener hasta 100 caracteres
- La pregunta puede tener hasta 255 caracteres
- El bot no puede votar en encuestas (solo crear y recibir votos)
- Los resultados se almacenan solo en memoria (se pierden al reiniciar)

## 💡 Mejoras Sugeridas

1. **Persistencia**: Guardar resultados en base de datos
2. **Exportación**: Generar reportes en CSV/Excel
3. **Análisis**: Gráficos más elaborados
4. **Programación**: Encuestas automáticas programadas
5. **Plantillas**: Encuestas predefinidas reutilizables

## 🔍 Debugging

La consola mostrará:
- `📊 Iniciando prueba de encuestas...` al comenzar
- `✅ Encuesta de [tipo] enviada: [ID]` por cada encuesta creada
- `📊 VOTO RECIBIDO:` con detalles de cada voto
- `✅/❌` cuando usuarios votan o retiran votos
- `📈` Total de votos y distribución actualizada

## 📝 Notas Técnicas

- La función utiliza `async/await` para manejo asíncrono
- Incluye delays de 2 segundos entre encuestas para evitar límites
- Maneja errores con try/catch y mensajes descriptivos
- Adapta el comportamiento según el tipo de chat (grupo/privado)
- Utiliza formateo de WhatsApp (negrita con `*texto*`)

---

Esta implementación proporciona una base sólida para trabajar con encuestas en WhatsApp Web JS. Puede extenderse según las necesidades específicas de cada proyecto.
