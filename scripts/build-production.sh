#!/bin/bash

echo "Building production app with experimental compile mode..."
npm run build -- --experimental-build-mode=compile

if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo ""
    echo "Note: The app was built with experimental compile mode to avoid static generation issues."
    echo "All pages will be rendered dynamically on the server."
else
    echo "Build failed!"
    exit 1
fi