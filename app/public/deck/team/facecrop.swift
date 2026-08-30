// Square, face-centred crop for the deck's end-credits slide.
// Uses the Vision framework's face detector so the crop is measured, not eyeballed.
// If no face is found it falls back to a portrait crop (centre x, upper third),
// which is the right answer for a standing photo and is reported as a fallback --
// a silent guess dressed up as a detection is exactly what we do not want here.
import Foundation
import AppKit
import Vision

let OUT_PX = 720.0            // square output edge
let HEAD   = 2.35             // face box is multiplied by this, so the crop is a
                              // head-and-shoulders portrait rather than a tight face
let EYELINE = 0.42            // where the face centre sits vertically in the crop

func fail(_ m: String) -> Never { FileHandle.standardError.write((m+"\n").data(using:.utf8)!); exit(1) }

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: facecrop <in> <out.jpg>") }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])

guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil),
      let cg  = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fail("cannot read \(args[1])") }

let W = Double(cg.width), H = Double(cg.height)

// --- find the largest face -------------------------------------------------
var faceRect: CGRect? = nil
let req = VNDetectFaceRectanglesRequest()
do {
    try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    if let obs = req.results as? [VNFaceObservation], !obs.isEmpty {
        // Vision returns a NORMALISED rect with the origin at the BOTTOM-left,
        // while CGImage cropping wants TOP-left pixels -- flip y or the crop
        // lands on the subject's feet.
        let best = obs.max(by: { $0.boundingBox.width * $0.boundingBox.height
                               < $1.boundingBox.width * $1.boundingBox.height })!
        let b = best.boundingBox
        faceRect = CGRect(x: b.minX * W, y: (1.0 - b.maxY) * H, width: b.width * W, height: b.height * H)
    }
} catch { /* fall through to the portrait fallback */ }

var side: Double, ox: Double, oy: Double, mode: String
if let f = faceRect {
    side = min(max(Double(f.width), Double(f.height)) * HEAD, min(W, H))
    ox   = Double(f.midX) - side / 2.0
    oy   = Double(f.midY) - side * EYELINE
    mode = "face"
} else {
    side = min(W, H)
    ox   = (W - side) / 2.0
    oy   = min(H - side, (H - side) * 0.22)   // upper third, where a standing subject's head is
    mode = "fallback-portrait"
}
// clamp so the square never runs off the edge (which would crop to a black band)
ox = max(0, min(W - side, ox))
oy = max(0, min(H - side, oy))

guard let cropped = cg.cropping(to: CGRect(x: ox, y: oy, width: side, height: side)) else { fail("crop failed") }

// --- downscale to a fixed square ------------------------------------------
let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: Int(OUT_PX), height: Int(OUT_PX), bitsPerComponent: 8,
                          bytesPerRow: 0, space: cs,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { fail("ctx failed") }
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: OUT_PX, height: OUT_PX))
guard let outImg = ctx.makeImage() else { fail("render failed") }

guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, "public.jpeg" as CFString, 1, nil)
      else { fail("cannot write \(args[2])") }
CGImageDestinationAddImage(dest, outImg, [kCGImageDestinationLossyCompressionQuality: 0.9] as CFDictionary)
guard CGImageDestinationFinalize(dest) else { fail("write failed") }

print("\(inURL.lastPathComponent) -> \(outURL.lastPathComponent)  mode=\(mode)  src=\(Int(W))x\(Int(H))  side=\(Int(side))")
