import Foundation
import Vision
import AppKit
let goldOnly=CommandLine.arguments.contains("--gold")
for path in CommandLine.arguments.dropFirst().filter({$0 != "--gold"}) {
 guard let ns=NSImage(contentsOfFile:path),let tiff=ns.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let cg=bitmap.cgImage else {fatalError("Cannot read \(path)")}
 let req=VNRecognizeTextRequest();req.recognitionLevel = .accurate;req.recognitionLanguages=["en-US"];req.usesLanguageCorrection=false
 if goldOnly {req.regionOfInterest=CGRect(x:0.098,y:0.961,width:0.055,height:0.038)}
 try VNImageRequestHandler(cgImage:cg,options:[:]).perform([req])
 let rows=(req.results ?? []).compactMap { observation -> [String:Any]? in guard let text=observation.topCandidates(1).first else{return nil};let raw=observation.boundingBox;let r=goldOnly ? CGRect(x:0.098+raw.origin.x*0.055,y:0.961+raw.origin.y*0.038,width:raw.width*0.055,height:raw.height*0.038):raw;return ["text":text.string,"confidence":text.confidence,"box":[r.origin.x,1-r.origin.y-r.height,r.width,r.height]] }
 let result:[String:Any]=["file":path,"observations":rows]
 let bytes=try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys]);print(String(data:bytes,encoding:.utf8)!)
}
