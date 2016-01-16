declare var require, process, __dirname;

let React = require('react');
let blessed = require('blessed');
let {render} = require('react-blessed');
let {loadCardYamlStats} = require("./data");

function resolvePercentage(percentage:number|string): string {
    if (typeof percentage === "number") {
        return `${percentage}%`;
    } else {
        return percentage;
    }
}

function Box({label, area, style, contents, border, children}) {
      let {left, top, width, height}:any = area || {};
      return <box label={label}
           left={left}
           width={width}
           height={height}
           top={top}
           border={border || {type: 'line'}}
           style={style}>
        {children || []}
      </box>
};

var App = ({width, height}) => {
   let minDim = Math.min(width,height)
   let xUnit = 4
   let yUnit = 2
   return <Box label="GoDWaR no-frills" style={{border: {fg: 'cyan'}}}>
           <Card area={{left: 10, top: 5, width: xUnit * 10, height: yUnit * 10}}/>
           Random text here...
   </Box>;
}

const HEIGHT_RATIO = 2;
const BASE_SIZE = 20;

interface CardUnitStats {
    Health: number;
    Movement: number;
    Attack: number;
    Range: number;
}
interface CardStats {
    Description: string;
    Image: string;
    Traits: string[];
    CardUnitStats: CardUnitStats;
}

var Card = React.createClass({  
  render() {
    let {area: {width, height, left, top}, stats} = this.props;
    const STAT_ROOM = BASE_SIZE / 2;

    let statsBox = stats ? (<Box label={"Stats"} area={{width: 15, height: 6}}>
        <element top={0} style ={{fg: '#009900'}}>{"Health 8"}</element>
        <element top={1} style ={{fg: '#cc6600'}}>{"Movement 8"}</element>
        <element top={2} style ={{fg: '#ff6666'}}>{"Attack 8"}</element>
        <element top={3} style ={{fg: 'white'}}>{"Range 8"}</element>
    </Box>) : <element/>;
    return <Box label={"Gallanthor's Fallen Prophet"} area={{width, height, left, top}}> 
        <layout width={25} height={height-2}>
            <element style ={{fg: '#cc6600'}}> {"Gold 1"} </element>
            <element style ={{fg: '#cc99ff'}}> {"Miracle 2"} </element>
            {statsBox}
        </layout>
        <Box label={"Description"}
           area={{top: 6, width: width - 2, height: height-8}}>
            {"On Summon: If a creature with the text 'Gallanthor' in its name is on the field, you win."}
        </Box>
        <image 
            left={17} top={1}
            width={width/2}
            height={height/4}
            file="https://stuffisstuff.files.wordpress.com/2009/08/goblin_face.png"
        />
    </Box>;
    return <Box label={"Gallanthor's Fallen Prophet"} area={{width, height, left, top}}> 

    </Box>;
  }
});

var BlessedScreen = React.createClass({
    componentDidMount(){
        let {screen} = this.props;
        screen.on('resize', () => {
            this.setState(this.getInitialState());
        });
    },
    getInitialState() {
        let {screen: {width, height}} = this.props;
        return {width, height};
    },
    render() {
        let {screen: {width, height}} = this.props;
        return <App width={width} height={height}/>;
    }
});

function main() {
    const screen = blessed.screen({
      autoPadding: true,
      smartCSR: true,
      title: 'react-blessed demo app'
    });
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return process.exit(0);
    });

    loadCardYamlStats(console.log);

    const component = render(<BlessedScreen screen={screen}/>, screen);
}
main();
