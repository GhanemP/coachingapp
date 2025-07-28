import { NextRequest, NextResponse } from 'next/server';
// import swaggerUi from 'swagger-ui-express'; // Unused import

import { swaggerSpec } from '@/lib/swagger';

// Generate the Swagger UI HTML
function generateSwaggerHTML(_spec: unknown) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartSource Coaching Hub API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #1f2937;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add CSRF token if available
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
          if (csrfToken) {
            request.headers['X-CSRF-Token'] = csrfToken;
          }
          return request;
        },
        responseInterceptor: function(response) {
          return response;
        }
      });
    };
  </script>
</body>
</html>`;
}

export function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Serve the Swagger UI HTML
    if (url.pathname === '/api/docs') {
      const html = generateSwaggerHTML(swaggerSpec);

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    return NextResponse.json(
      { error: 'Not Found', message: 'API documentation endpoint not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error serving API documentation:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to serve API documentation',
      },
      { status: 500 }
    );
  }
}
