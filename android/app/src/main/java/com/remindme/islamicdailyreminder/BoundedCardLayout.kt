package com.remindme.islamicdailyreminder

import android.content.Context
import android.util.AttributeSet
import android.view.View
import android.widget.LinearLayout

class BoundedCardLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    var minWidthPx: Int = 0
        set(value) {
            field = value
            requestLayout()
        }
    var maxWidthPx: Int = Int.MAX_VALUE
        set(value) {
            field = value
            requestLayout()
        }
    var minHeightPx: Int = 0
        set(value) {
            field = value
            requestLayout()
        }
    var maxHeightPx: Int = Int.MAX_VALUE
        set(value) {
            field = value
            requestLayout()
        }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
        val targetMaxWidth = if (maxWidthPx in 1 until widthSize) maxWidthPx else widthSize
        val constrainedWidthSpec = MeasureSpec.makeMeasureSpec(targetMaxWidth, MeasureSpec.AT_MOST)

        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
        val targetMaxHeight = if (maxHeightPx in 1 until heightSize) maxHeightPx else heightSize

        // Dynamically compute available height for scroll child so header and footer stay pinned
        val scrollChild = findViewById<BoundedScrollView>(R.id.scroll_content)
        if (scrollChild != null && targetMaxHeight < Int.MAX_VALUE) {
            val headerView = findViewById<View>(R.id.header_container)
            val footerView = findViewById<View>(R.id.footer_container)

            val unspec = MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
            headerView?.measure(constrainedWidthSpec, unspec)
            footerView?.measure(constrainedWidthSpec, unspec)

            val headerH = headerView?.measuredHeight ?: 0
            val footerH = footerView?.measuredHeight ?: 0
            val paddingV = paddingTop + paddingBottom

            val availableForScroll = Math.max(100, targetMaxHeight - headerH - footerH - paddingV)
            scrollChild.maxScrollHeightPx = availableForScroll
        }

        val constrainedHeightSpec = MeasureSpec.makeMeasureSpec(targetMaxHeight, MeasureSpec.AT_MOST)
        super.onMeasure(constrainedWidthSpec, constrainedHeightSpec)

        var finalW = measuredWidth
        var finalH = measuredHeight

        if (minWidthPx > 0 && finalW < minWidthPx) {
            finalW = Math.min(minWidthPx, targetMaxWidth)
        }
        if (minHeightPx > 0 && finalH < minHeightPx) {
            finalH = Math.min(minHeightPx, targetMaxHeight)
        }

        setMeasuredDimension(finalW, finalH)
    }
}
