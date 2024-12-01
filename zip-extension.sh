#!/bin/bash

zip -r -X extension.zip * -x "__MACOSX*" "*.DS_Store" "manifest.local" "*.zip" "*.sh"
