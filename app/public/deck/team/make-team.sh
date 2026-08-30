#!/bin/bash
# Face-crop the four team photos for the end-credits slide.
#
#   1. Save the originals into team/src/ named ashish / joshua / anil / mohan
#      (any extension: .jpg .jpeg .png .heic .webp)
#   2. ./make-team.sh
#
# Each output is a 720x720 face-centred square. The script PRINTS the mode per
# photo: "face" means Vision found a face and centred on it; "fallback-portrait"
# means it did not and used an upper-centre crop -- check that one by eye.
set -u
cd "$(dirname "$0")" || exit 1
[ -x ./facecrop ] || swiftc -O facecrop.swift -o facecrop || exit 1

miss=0
for who in ashish joshua anil mohan; do
  f=$(ls src/"$who".* 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "MISSING  src/$who.<ext>"; miss=$((miss+1)); continue; fi
  ./facecrop "$f" "$who.jpg" || miss=$((miss+1))
done
echo "---"
[ "$miss" -eq 0 ] && echo "all four cropped -> reload http://localhost:3000/deck/ (last slide)" \
                  || echo "$miss missing or failed; those cards show a monogram instead"
