import { snapToPixel } from "./game-text";

export interface StackElement {
  x: number;
  y: number;
  height?: number;
  displayHeight?: number;
}

/**
 * VerticalStack 流式纵向排版容器
 * 彻底消除固定 Y 轴偏移（y + 30, y + 60 等）导致的文本重叠与排版穿模
 * 支持根据元素实际高度（displayHeight / height）自动顺延定位，并强制像素取整对齐
 */
export class VerticalStack {
  private currentY: number;
  private startX: number;
  private gap: number;

  constructor(startX: number, startY: number, gap = 10) {
    this.startX = snapToPixel(startX);
    this.currentY = snapToPixel(startY);
    this.gap = snapToPixel(gap);
  }

  /**
   * 将元素放入纵向流中，自动计算并更新其 x 与 y 坐标
   * @param element 待排版的元素（支持 GameObjects.Text、Container、Graphics 等）
   * @returns 分配给该元素的 y 坐标
   */
  public add<T extends StackElement>(element: T): number {
    element.x = this.startX;
    element.y = this.currentY;
    const h = Math.ceil(element.displayHeight ?? element.height ?? 0);
    this.currentY = snapToPixel(this.currentY + h + this.gap);
    return element.y;
  }

  /**
   * 获取当前纵向排版游标的 Y 坐标
   */
  public getY(): number {
    return this.currentY;
  }

  /**
   * 增加额外的纵向留白间距
   */
  public addSpacing(space: number): void {
    this.currentY = snapToPixel(this.currentY + space);
  }

  /**
   * 动态更新水平 X 对齐基准
   */
  public setX(newX: number): void {
    this.startX = snapToPixel(newX);
  }
}
