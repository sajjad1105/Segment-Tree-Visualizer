"use client"
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import "./styles/SegmentTreeD3.css";
import { ToastContainer, toast } from "react-toastify";
import downloadSVGAsPNG from "./functions/downloadSVGAsPNG/downloadSVGAsPNG";
import fitSegmentTree from "./functions/FitInTheFrame/fitSegmentTree";
import DownloadIcon from "./functions/downloadSVGAsPNG/download-solid.svg";
import FitIcon from "./functions/FitInTheFrame/fit-solid.svg";
import Image from "next/image";

export default function SegmentTreeD3({ data, animationDelay }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data) return;

    const width = 1000;
    const height = 660;
    const nodeRadius = 20;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(
        d3.zoom()
          .scaleExtent([0.3, 2]) // Set zoom level limits 0.3x to 2x
          .on("zoom", (event) => {
            g.attr("transform", event.transform);
          })
      );

    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${width / 2}, 50)`);

    // Create layers for links and nodes
    const linkLayer = g.append("g").attr("class", "link-layer");
    const nodeLayer = g.append("g").attr("class", "node-layer");

    const root = d3.hierarchy(data);
    const horizontalSpacing = 150;
    const verticalSpacing = 150;

    const treeLayout = d3.tree().nodeSize([horizontalSpacing, verticalSpacing]);
    treeLayout(root);

    const sanitizeClassName = (range) =>
      `range-${range.replace(/[\[\],\s]/g, "-")}`;

    const renderLink = (source, target) => {
      linkLayer
        .append("path")
        .attr(
          "d",
          d3
            .linkVertical()
            .x((d) => d.x)
            .y((d) => d.y)({
              source: { x: source.x, y: source.y },
              target: { x: target.x, y: target.y },
            })
        )
        .attr(
          "class",
          `link-${sanitizeClassName(source.data.range)}-${sanitizeClassName(
            target.data.range
          )}`
        )
        .attr("stroke", "#d3d3d3")
        .attr("fill", "none")
        .attr("stroke-width", 2);
    };

    const renderNode = (node) => {
      const nodeGroup = nodeLayer
        .append("g")
        .attr("class", `node-${sanitizeClassName(node.data.range)}`)
        .attr("transform", `translate(${node.x},${node.y})`);

      // Render circle first
      nodeGroup
        .append("circle")
        .attr("r", nodeRadius)
        .attr("fill", "#d3d3d3")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      // Display range above the node
      nodeGroup
        .append("text")
        .text(`${node.data.range}`)
        .attr("y", -nodeRadius - 12)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", "14px");

      // Placeholder for value inside the node
      nodeGroup
        .append("text")
        .text("?") // Initially empty text
        .attr("class", "node-value")
        .attr("y", 4)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "16px");
    };

    const updateNodeValueOnBacktrack = (node) => {
      const nodeGroup = nodeLayer.select(
        `.node-${sanitizeClassName(node.data.range)}`
      );
      const nodeText = nodeGroup.select(".node-value");
      nodeText.text(`${node.data.value}`).style("visibility", "visible");
    };

    const highlightPath = (source, target, color, isBacktracking = false) => {
      const path = linkLayer
        .select(`.link-${sanitizeClassName(source.data.range)}-${sanitizeClassName(target.data.range)}`);

      // ✅ Ensure path exists before proceeding
      if (path.empty() || !path.node()) {
        console.warn(`Path from ${source.data.range} to ${target.data.range} not found.`);
        return;
      }

      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", isBacktracking ? 0 : totalLength)
        .transition()
        .duration(animationDelay)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", isBacktracking ? totalLength : 0);
    };


    const highlightNode = (node, color) => {
      nodeLayer
        .select(`.node-${sanitizeClassName(node.data.range)}`)
        .select("circle")
        .attr("fill", color);
    };

    const buildTreeAnimation = async (node) => {
      if (!node) return;

      // Render the node during descent
      renderNode(node);
      highlightNode(node, "#1e90ff");

      // Traverse left subtree
      if (node.children && node.children[0]) {
        await delay(animationDelay);
        renderLink(node, node.children[0]);
        highlightPath(node, node.children[0], "#1e90ff");
        await buildTreeAnimation(node.children[0]);
      }

      // Traverse right subtree
      if (node.children && node.children[1]) {
        await delay(animationDelay);
        renderLink(node, node.children[1]);
        highlightPath(node, node.children[1], "#1e90ff");
        await buildTreeAnimation(node.children[1]);
      }

      // Update node value during backtracking
      await delay(animationDelay);
      updateNodeValueOnBacktrack(node);
      highlightNode(node, "#0e695a");

      // Highlight the path back with green color on backtracking
      if (node.parent) {
        highlightPath(node.parent, node, "#0e695a");
      }

      nodeLayer
        .select(`.node-${sanitizeClassName(node.data.range)}`)
        .select("circle")
        .attr("stroke", "white");

      if (!node.parent) {
        toast.success("Segment Tree built successfully! 🎉");
      }
    };

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    buildTreeAnimation(root);
  }, [data]);

  return (
    <>
      <div id="svg-container">
        {/* ✅ Buttons container for absolute positioning */}
        <div className="buttons-container">
          <button onClick={fitSegmentTree}>
            <Image src={FitIcon} alt="Fit Tree" className="icon" /> Fit in frame
          </button>
          <button onClick={downloadSVGAsPNG}>
            <Image src={DownloadIcon} alt="Download PNG" className="icon" /> Download as PNG
          </button>
        </div>
        <svg id="my-svg" ref={svgRef}></svg>
      </div>
      <ToastContainer position="top-right" theme="dark" autoClose={2000} />
    </>
  );
}

export function changeNodeAppearance(range, color, newValue) {
  const sanitizeClassName = (range) =>
    `range-${range.replace(/[\[\],\s]/g, "-")}`;

  const nodeSelection = d3.select(`.node-${sanitizeClassName(range)}`);

  // ✅ Change node color
  nodeSelection.select("circle").attr("fill", color);

  // ✅ Update node value inside the circle
  nodeSelection.select(".node-value").text(newValue);
}

export function changePathColor(parentRange, childRange, color, isBacktracking = false) {
  const sanitizeClassName = (range) =>
    `range-${range.replace(/[\[\],\s]/g, "-")}`;

  const path = d3.select(`.link-${sanitizeClassName(parentRange)}-${sanitizeClassName(childRange)}`);

  if (path.empty() || !path.node()) return; // Avoid errors if path is not found

  const totalLength = path.node().getTotalLength();

  path
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", isBacktracking ? 0 : totalLength) // 🔹 Reverse direction for backtracking
    .transition()
    .duration(300)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", isBacktracking ? totalLength : 0); // 🔹 Animate in reverse if backtracking
}
