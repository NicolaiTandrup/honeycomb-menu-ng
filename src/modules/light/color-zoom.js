// Twelve physical slots, no rotation: five clockwise samples towards the next
// current anchor, six counterclockwise samples towards the previous anchor.
const INITIAL = [0,25,50,80,115,150,180,205,230,265,300,335].map(hue=>[hue,85]);
function refinePalette(palette, selected)
{
    if (!Array.isArray(palette) || palette.length!==12 || !Number.isInteger(selected) || selected<0 || selected>=12 ||
        palette.some(color=>!Array.isArray(color) || color.length!==2 || !color.every(Number.isFinite) || color[0]<0 || color[0]>360 || color[1]<0 || color[1]>100))
        throw new Error('Color zoom requires twelve valid HS colors and a selected index.');
    const at=index=>((index%12)+12)%12;
    const center=palette[selected],result=Array(12);
    result[selected]=[...center];
    const sample=(anchor,step,total)=>{
        if (step===total) return [...anchor]; // Exact endpoints, including 360°.
        let delta=((anchor[0]-center[0]+540)%360)-180;
        if (delta===-180) delta=180; // Deterministic half-circle tie.
        return [((center[0]+delta*step/total)%360+360)%360,center[1]+(anchor[1]-center[1])*step/total];
    };
    for(let step=1;step<=5;step++)result[at(selected+step)]=sample(palette[at(selected+1)],step,5);
    for(let step=1;step<=6;step++)result[at(selected-step)]=sample(palette[at(selected-1)],step,6);
    return result;
}
module.exports={INITIAL,refinePalette};
