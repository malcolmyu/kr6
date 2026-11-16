import type {Point} from './types'
export interface SliceRect {pos:Point;size:Point}
export interface SliceDraw {source:[number,number,number,number];destination:[number,number,number,number]}
/** GG59View.redraw: physical atlas pixels, including negative slice margins and small-target corner scaling. */
export function nineSliceDraws(image:Point,size:Point,slice:SliceRect,overdraw=false,refScale=.5):SliceDraw[]{
 const iw=image.x/refScale,ih=image.y/refScale,x1=slice.pos.x/refScale,y1=slice.pos.y/refScale,x2=(slice.pos.x+slice.size.x)/refScale,y2=(slice.pos.y+slice.size.y)/refScale
 const sw=slice.size.x/refScale,sh=slice.size.y/refScale,right=iw-x2,bottom=ih-y2,w=size.x/refScale,h=size.y/refScale,kx=w<x1+right?w/(x1+right):1,ky=h<y1+bottom?h/(y1+bottom):1,dx1=x1*kx,dy1=y1*ky,dx2=w-right*kx,dy2=h-bottom*ky,sx=(dx2-dx1)/sw,sy=(dy2-dy1)/sh
 const xs=[0,x1,x2],ys=[0,y1,y2],ws=[x1,sw,right],hs=[y1,sh,bottom],result:SliceDraw[]=[]
 const add=(col:number,row:number,x:number,y:number,scaleX:number,scaleY:number)=>{if(scaleX>0&&scaleY>0)result.push({source:[xs[col],ys[row],ws[col],hs[row]],destination:[x,y,ws[col]*scaleX,hs[row]*scaleY]})}
 add(1,1,dx1,dy1,sx,sy);add(1,0,dx1,0,sx,ky);add(2,1,dx2,dy1,kx,sy);add(1,2,dx1,dy2,sx,ky);add(0,1,0,dy1,kx,sy)
 if(overdraw&&sx>=1&&sy>=1){const cx=w/2-sw/2,cy=h/2-sh/2;add(1,0,cx,0,1,1);add(2,1,dx2,cy,1,1);add(1,2,cx,dy2,1,1);add(0,1,0,cy,1,1)}
 add(0,0,0,0,kx,ky);add(2,0,dx2,0,kx,ky);add(0,2,0,dy2,kx,ky);add(2,2,dx2,dy2,kx,ky)
 return result
}
