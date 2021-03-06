import { ApiClienteService } from './../../shared/services/api-cliente-service';
import { Component, OnInit, ElementRef, ViewChild, Input, Output, EventEmitter, HostListener, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { extent, path } from 'd3';
import { Subscription, Observable, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
@Component({
  selector: 'map',
  templateUrl: './map-choropleth.component.html',
  styleUrls: ['./map-choropleth.component.scss']
})
export class MapChoroplethComponent implements OnInit, OnDestroy {

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (this.svg) {
      this.calcularTamanhoMapa();
      
    }
  }

  svg: any;
  svgLegend: any;
  widthPadraoMapa = 600;
  heightPadraoMapa = 480;
  widthMapaBr = 380;
  heightMapaBr = 420;
  dados: any;
  legendaDeCores = [];
  widthChange: BehaviorSubject<number>;
  widthChangeSub: Subscription;
  @Input() confirmados: number;
  @Input() casosPorEstado: any[];
  @Output() estadoSelecionado = new EventEmitter();
  g: any;
  @ViewChild("container", { static: true }) protected container: ElementRef;
  @ViewChild("brasil_mapa", { static: true }) protected chartContainer: ElementRef;
  @ViewChild("legenda_brasil_mapa", { static: true }) protected legendContainer: ElementRef;

  constructor(private api: ApiClienteService) { }

  ngOnInit() {
    this.calcularTamanhoMapa();
  }

  ngOnDestroy() {
    if (this.widthChange) {
      this.widthChange.complete();
    }
  }

  calcularTamanhoMapa() {
    this.widthMapaBr = Math.min(this.widthPadraoMapa, this.container.nativeElement.offsetWidth);
    const escala = this.widthMapaBr/this.widthPadraoMapa;
    this.heightMapaBr =  Math.floor(this.heightPadraoMapa * escala);
    
    if (!this.widthChange){
      this.widthChange = new BehaviorSubject<number>(this.widthMapaBr);
      this.widthChange.pipe(
        debounceTime(300),
        distinctUntilChanged(),
      ).subscribe(() => {
        this.configurarMapa();
      })
    } else {
      this.widthChange.next(this.widthMapaBr);
    }
  }

  async configurarMapa() {
    if (this.casosPorEstado && this.casosPorEstado.length > 0) {
      if (this.svg) {
        this.svg.remove();
      }
      /*cria o svg no html */
      this.svg = d3.select(this.chartContainer.nativeElement).append("svg");
      this.svg.attr('width', this.widthMapaBr);
      this.svg.attr('height', this.heightMapaBr);
      /* carrega os dados dos estados preparados para o mapa*/
      const data = await d3.json("../../../assets/estados-brasil.json" );
      const topology = topojson.feature(data, data.objects['estados']);
      /* cria projeção do mapa centralizado na página */
      const projection = d3.geoMercator().scale(5).center([0, 0]).translate([this.widthMapaBr , this.heightMapaBr/2 ]);
      projection.fitSize([this.widthMapaBr, this.heightMapaBr - 10], topology);
      /* linha do mapa baseado em Geolocation */
      const path = d3.geoPath().projection(projection);
      /* inicio do conteúdo do SVG */
      this.g = this.svg.append('g');
      /* adiciona os atributos no path e carrega os dados topológicos */
      this.g.attr('class', 'states')
        .selectAll('path')
        .data(topology['features'])
        .enter()
        .append('path')
        .attr('class', 'path-region')
        .style("stroke", "transparent")
        /* Para cada marcação no mapa por estado, preenche com uma cor */
        .attr('fill', (d) => {return this.setarCorPorEstado(d)})
        .attr('d', path)
        .attr('pointer-events', 'all')
        /* evento de hover, para adicionar opacidade e uma borda */
        .on('mouseover', (d:any) => {
          d3.selectAll('.path-region')
          d3.select(d3.event.currentTarget)
          .style('opacity', .8)
          .style('stroke-width', 2)
          .style('stroke', '#6c757d')
          this.estadoSelecionado.emit(d);
        })
        /* evento de saida do hover, para remover opacidade e borda */
        .on('mouseleave', (d:any) => {
          d3.selectAll(".path-region")
          d3.select(d3.event.currentTarget)
          .style("opacity", 1.0)
          .style('stroke', 'transparent')
        })
        .on('touchstart', (d) => {
        //if (onceTouchedRegion === d) onceTouchedRegion = null;
        //else onceTouchedRegion = d;
        })
        .on('click', (d) => {
          //if (onceTouchedRegion) {
          //return;
        //}
        //if (mapMeta.mapType === MAP_TYPES.STATE) {
          //return;
        //}
        //changeMap(d.properties[propertyField], mapMeta.mapType);
        })
        .style('cursor', 'pointer')
        /* adicionar na propriedade text do path, a quantidade de casos confirmados do estado */
        .append('title')
        .text((d) => this.mostrarTituloPorEstado(d));
        /* adiciona uma nova linha no gráfico de texto para apresentar a sigla do estado */
        this.g.append("g")
        .attr("class", "states")
        .selectAll("text")
        .data(topology['features'])
        .enter()
        .append("svg:text")
        .text((d) => {return d.id})
        .attr("x", (d) => path.centroid(d)[0])
        .attr("y", (d) => path.centroid(d)[1])
        .attr("text-anchor","middle")
        .attr('font-size', '0.4em')
        .attr('fill', '#6c757d')
        .attr('font-weight', 'bold')
        .attr('font-family', 'Archia')
        .attr('font-style', 'normal')
        /* adiciona um novo path por estado com borda */
        this.svg.append('path')
          .attr('stroke', '#ff073a20')
          .attr('fill', 'none')
          .attr('stroke-width', 2)
          .attr('d', path(topojson.mesh(data, data.objects['estados'])));
          this.configurarLegenda();
      }
  }

  configurarLegenda() {

    if (this.svgLegend) {
      this.svgLegend.remove();
    }

    this.svgLegend = d3.select(this.legendContainer.nativeElement)
                      .append("svg")
                      .attr("width", this.widthMapaBr + 50)
                      .attr("height", 30);

    if (this.legendaDeCores && this.legendaDeCores.length > 0) {

      this.legendaDeCores.sort((a,b) => a.casosPorEstado - b.casosPorEstado)

      const vlrCorExtent = d3.extent(this.legendaDeCores, cor => cor.casosPorEstado);
      const ticks = this.gerarTicks(vlrCorExtent[0], vlrCorExtent[1]);
      const scaleLegend = d3.scaleLinear()
                            .range([0, this.widthMapaBr])
                            .domain(vlrCorExtent);

      const posicaoX = d3.axisBottom(scaleLegend)
                      .tickSize(20)
                      .tickValues(ticks);

      const g = this.svgLegend.append('g').attr('transform', 'translate(10,0)');
      const defs = this.svgLegend.append("defs").style('transform', `translateX(50px)`)

      const linearGradient = defs.append("linearGradient").attr("id", "legendaGradiente");
      linearGradient.selectAll("stop")
                    .data(this.legendaDeCores)
                    .enter().append("stop")
                    .attr("offset", (d:any)=> {
                      return ((d.casosPorEstado - 0) / (vlrCorExtent[1] - vlrCorExtent[0]) * 100) + '%'
                    })
                    .attr("stop-color", (d:any) => d.rgb);

      g.append("rect")
        .attr("width", this.widthMapaBr)
        .attr("height",16)
        .style("fill", "url(#legendaGradiente)");

      g.append("g")
        .call(posicaoX)
        .select(".domain").remove();

    }


  }

  setarCorPorEstado(estadoDoGrafico: any): any {
    const estado = this.casosPorEstado.find(e => e.state === estadoDoGrafico.id)
    const cor = estado.confirmed === null ? '#fff' : d3.interpolateReds( (estado.confirmed * 3) / (this.confirmados || 0.001))
    this.adicionarCorLegendaDeCor(cor, estado.confirmed);
    return cor;
  }

  adicionarCorLegendaDeCor(rgb:any, casosConfirmados: any){
    const objLegenda = {rgb : '',casosPorEstado: null}
    objLegenda.rgb = rgb;
    objLegenda.casosPorEstado = casosConfirmados;
    this.legendaDeCores.push(objLegenda);
  }

  mostrarTituloPorEstado(estadoDoGrafico:any) : any {
    const estado = this.casosPorEstado.find(e => e.state === estadoDoGrafico.id)
    const totalPercentual = parseFloat((100 * (estado.confirmed / this.confirmados)).toFixed(2));
    return totalPercentual.toString() +'% para ' + estadoDoGrafico.properties['nome']
  }

  gerarTicks(minVlr:number, maxVlr:number): any[] {
    const arrTicks = [];
    for (let index = 0; index < 10; index++) {
      if (index == 0) {
        arrTicks.push(0)
      } else {
        const vlrPercentual = maxVlr / 9;
        const vlrIntervalo = arrTicks[index - 1] + vlrPercentual;
        arrTicks.push(Number(vlrIntervalo.toFixed(0)));
      }
    }
    return arrTicks;
  }
}
