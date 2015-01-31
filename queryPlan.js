
/*!
Copyright (c) 2002-2014 "Neo Technology,"
Network Engine for Objects in Lund AB [http://neotechnology.com]

This file is part of Neo4j.

Neo4j is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {
  neo.queryPlan = function(element) {
    var augment, color, colors, costColor, detailFontSize, display, fixedWidthFont, formatNumber, layout, margin, operatorCategories, operatorCornerRadius, operatorDetailHeight, operatorDetails, operatorHeaderFontSize, operatorHeaderHeight, operatorMargin, operatorPadding, operatorWidth, plural, rankMargin, render, rows, standardFont, transform;
    operatorWidth = 180;
    operatorCornerRadius = 4;
    operatorHeaderHeight = 18;
    operatorHeaderFontSize = 11;
    operatorDetailHeight = 14;
    detailFontSize = 10;
    operatorMargin = 50;
    operatorPadding = 3;
    rankMargin = 50;
    margin = 10;
    standardFont = "'Helvetica Neue',Helvetica,Arial,sans-serif";
    fixedWidthFont = "Monaco,'Courier New',Terminal,monospace";
    costColor = '#F25A29';
    operatorCategories = {
      seek: ['scan', 'seek', 'argument'],
      expand: ['expand', 'product'],
      eager: ['eager'],
      filter: ['select', 'filter'],
      rows: ['limit', 'skip', 'sort', 'union', 'projection'],
      other: [],
      result: ['result']
    };
    augment = function(color) {
      console.log('lightness', d3.hsl(color).l);
      return {
        color: color,
        'border-color': d3.rgb(color).darker(),
        'text-color-internal': d3.hsl(color).l < 0.7 ? '#FFFFFF' : '#000000'
      };
    };
    colors = d3.scale.ordinal().domain(['skip', 'skip'].concat(d3.keys(operatorCategories))).range(colorbrewer.Blues[9]);
    color = function(d) {
      var keyword, keywords, name, _i, _len;
      for (name in operatorCategories) {
        keywords = operatorCategories[name];
        for (_i = 0, _len = keywords.length; _i < _len; _i++) {
          keyword = keywords[_i];
          if (new RegExp(keyword, 'i').test(d)) {
            return augment(colors(name));
          }
        }
      }
      return augment(colors('other'));
    };
    rows = function(operator) {
      var _ref, _ref1;
      return (_ref = (_ref1 = operator.Rows) != null ? _ref1 : operator.EstimatedRows) != null ? _ref : 0;
    };
    plural = function(noun, count) {
      if (count === 1) {
        return noun;
      } else {
        return noun + 's';
      }
    };
    formatNumber = d3.format(",.0f");
    operatorDetails = function(operator) {
      var detail, details, expression, identifiers, wordWrap, y, _i, _len, _ref, _ref1, _ref2, _ref3;
      if (!operator.expanded) {
        return [];
      }
      details = [];
      wordWrap = function(string, className) {
        var firstWord, lastWord, measure, words, _results;
        measure = function(text) {
          return neo.utils.measureText(text, fixedWidthFont, 10);
        };
        words = string.split(/([^a-zA-Z\d])/);
        firstWord = 0;
        lastWord = 1;
        _results = [];
        while (firstWord < words.length) {
          while (lastWord < words.length && measure(words.slice(firstWord, lastWord + 1).join('')) < operatorWidth - operatorPadding * 2) {
            lastWord++;
          }
          details.push({
            className: className,
            value: words.slice(firstWord, lastWord).join('')
          });
          firstWord = lastWord;
          _results.push(lastWord = firstWord + 1);
        }
        return _results;
      };
      if (identifiers = (_ref = operator.identifiers) != null ? _ref : (_ref1 = operator.KeyNames) != null ? _ref1.split(', ') : void 0) {
        wordWrap(identifiers.filter(function(d) {
          return !(/^  /.test(d));
        }).join(', '), 'identifiers');
        details.push({
          className: 'padding'
        });
      }
      if (expression = (_ref2 = (_ref3 = operator.LegacyExpression) != null ? _ref3 : operator.ExpandExpression) != null ? _ref2 : operator.LabelName) {
        wordWrap(expression, 'expression');
        details.push({
          className: 'padding'
        });
      }
      if ((operator.Rows != null) && (operator.EstimatedRows != null)) {
        details.push({
          className: 'estimated-rows',
          key: 'estimated rows',
          value: formatNumber(operator.EstimatedRows)
        });
      }
      if ((operator.DbHits != null) && !operator.alwaysShowCost) {
        details.push({
          className: 'db-hits',
          key: plural('db hit', operator.DbHits || 0),
          value: formatNumber(operator.DbHits || 0)
        });
      }
      if (details.length && details[details.length - 1].className === 'padding') {
        details.pop();
      }
      y = operatorDetailHeight;
      for (_i = 0, _len = details.length; _i < _len; _i++) {
        detail = details[_i];
        detail.y = y;
        y += detail.className === 'padding' ? operatorPadding * 2 : operatorDetailHeight;
      }
      return details;
    };
    transform = function(queryPlan) {
      var collectLinks, links, operators, result;
      operators = [];
      links = [];
      result = {
        operatorType: 'Result',
        children: [queryPlan.root]
      };
      collectLinks = function(operator, rank) {
        var child, _i, _len, _ref, _results;
        operators.push(operator);
        operator.rank = rank;
        _ref = operator.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          child.parent = operator;
          collectLinks(child, rank + 1);
          _results.push(links.push({
            source: child,
            target: operator
          }));
        }
        return _results;
      };
      collectLinks(result, 0);
      return [operators, links];
    };
    layout = function(operators, links) {
      var alpha, center, child, childrenWidth, collide, costHeight, currentY, height, iterations, link, linkWidth, operator, operatorHeight, rank, ranks, relaxDownwards, relaxUpwards, tx, width, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1;
      costHeight = (function() {
        var scale;
        scale = d3.scale.linear().domain([
          0, d3.sum(operators, function(operator) {
            return operator.DbHits || 0;
          })
        ]).range([0, 100]);
        return function(operator) {
          return scale(operator.DbHits || 0);
        };
      })();
      operatorHeight = function(operator) {
        var height;
        height = operatorHeaderHeight;
        if (operator.expanded) {
          height += operatorDetails(operator).slice(-1)[0].y + operatorPadding * 2;
        }
        height += costHeight(operator);
        return height;
      };
      linkWidth = (function() {
        var scale;
        scale = d3.scale.log().domain([
          1, d3.max(operators, function(operator) {
            return rows(operator) + 1;
          })
        ]).range([
          2, (operatorWidth - operatorCornerRadius * 2) / d3.max(operators, function(operator) {
            return operator.children.length;
          })
        ]);
        return function(operator) {
          return scale(rows(operator) + 1);
        };
      })();
      for (_i = 0, _len = operators.length; _i < _len; _i++) {
        operator = operators[_i];
        operator.height = operatorHeight(operator);
        operator.costHeight = costHeight(operator);
        if (operator.costHeight > operatorDetailHeight + operatorPadding) {
          operator.alwaysShowCost = true;
        }
        childrenWidth = d3.sum(operator.children, linkWidth);
        tx = (operatorWidth - childrenWidth) / 2;
        _ref = operator.children;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          child = _ref[_j];
          child.tx = tx;
          tx += linkWidth(child);
        }
      }
      for (_k = 0, _len2 = links.length; _k < _len2; _k++) {
        link = links[_k];
        link.width = linkWidth(link.source);
      }
      ranks = d3.nest().key(function(operator) {
        return operator.rank;
      }).entries(operators);
      currentY = 0;
      for (_l = 0, _len3 = ranks.length; _l < _len3; _l++) {
        rank = ranks[_l];
        currentY -= d3.max(rank.values, operatorHeight) + rankMargin;
        _ref1 = rank.values;
        for (_m = 0, _len4 = _ref1.length; _m < _len4; _m++) {
          operator = _ref1[_m];
          operator.x = 0;
          operator.y = currentY;
        }
      }
      width = d3.max(ranks.map(function(rank) {
        return rank.values.length * (operatorWidth + operatorMargin);
      }));
      height = -currentY;
      collide = function() {
        var dx, i, lastOperator, x0, _len5, _len6, _n, _o, _ref2, _results;
        _results = [];
        for (_n = 0, _len5 = ranks.length; _n < _len5; _n++) {
          rank = ranks[_n];
          x0 = 0;
          _ref2 = rank.values;
          for (_o = 0, _len6 = _ref2.length; _o < _len6; _o++) {
            operator = _ref2[_o];
            dx = x0 - operator.x;
            if (dx > 0) {
              operator.x += dx;
            }
            x0 = operator.x + operatorWidth + operatorMargin;
          }
          dx = x0 - operatorMargin - width;
          if (dx > 0) {
            lastOperator = rank.values[rank.values.length - 1];
            x0 = lastOperator.x -= dx;
            _results.push((function() {
              var _p, _ref3, _results1;
              _results1 = [];
              for (i = _p = _ref3 = rank.values.length - 2; _p >= 0; i = _p += -1) {
                operator = rank.values[i];
                dx = operator.x + operatorWidth + operatorMargin - x0;
                if (dx > 0) {
                  operator.x -= operatorWidth;
                  _results1.push(x0 = operator.x);
                } else {
                  _results1.push(void 0);
                }
              }
              return _results1;
            })());
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      center = function(operator) {
        return operator.x + operatorWidth / 2;
      };
      relaxUpwards = function(alpha) {
        var x, _len5, _n, _results;
        _results = [];
        for (_n = 0, _len5 = ranks.length; _n < _len5; _n++) {
          rank = ranks[_n];
          _results.push((function() {
            var _len6, _o, _ref2, _results1;
            _ref2 = rank.values;
            _results1 = [];
            for (_o = 0, _len6 = _ref2.length; _o < _len6; _o++) {
              operator = _ref2[_o];
              if (operator.children.length) {
                x = d3.sum(operator.children, function(child) {
                  return linkWidth(child) * center(child);
                }) / d3.sum(operator.children, linkWidth);
                _results1.push(operator.x += (x - center(operator)) * alpha);
              } else {
                _results1.push(void 0);
              }
            }
            return _results1;
          })());
        }
        return _results;
      };
      relaxDownwards = function(alpha) {
        var _len5, _n, _ref2, _results;
        _ref2 = ranks.slice().reverse();
        _results = [];
        for (_n = 0, _len5 = _ref2.length; _n < _len5; _n++) {
          rank = _ref2[_n];
          _results.push((function() {
            var _len6, _o, _ref3, _results1;
            _ref3 = rank.values;
            _results1 = [];
            for (_o = 0, _len6 = _ref3.length; _o < _len6; _o++) {
              operator = _ref3[_o];
              if (operator.parent) {
                _results1.push(operator.x += (center(operator.parent) - center(operator)) * alpha);
              } else {
                _results1.push(void 0);
              }
            }
            return _results1;
          })());
        }
        return _results;
      };
      collide();
      iterations = 300;
      alpha = 1;
      while (iterations--) {
        relaxUpwards(alpha);
        collide();
        relaxDownwards(alpha);
        collide();
        alpha *= .98;
      }
      width = d3.max(operators, function(o) {
        return o.x;
      }) - d3.min(operators, function(o) {
        return o.x;
      }) + operatorWidth;
      return [width, height];
    };
    render = function(operators, links, width, height, redisplay) {
      var join, svg;
      svg = d3.select(element);
      svg.transition().attr('width', width + margin * 2).attr('height', height + margin * 2).attr('viewBox', [
        d3.min(operators, function(o) {
          return o.x;
        }) - margin, -margin - height, width + margin * 2, height + margin * 2
      ].join(' '));
      join = function(parent, children) {
        var child, selection, _i, _len, _ref, _results;
        _ref = d3.entries(children);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          selection = parent.selectAll(child.key).data(child.value.data);
          child.value.selections(selection.enter(), selection, selection.exit());
          if (child.value.children) {
            _results.push(join(selection, child.value.children));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      return join(svg, {
        '.link': {
          data: links,
          selections: function(enter) {
            return enter.append('g').attr('class', 'link');
          },
          children: {
            'path': {
              data: function(d) {
                return [d];
              },
              selections: function(enter, update) {
                enter.append('path').attr('fill', '#DFE1E3');
                return update.transition().attr('d', function(d) {
                  var control1, control2, controlWidth, curvature, sourceX, sourceY, targetX, targetY, yi;
                  width = Math.max(1, d.width);
                  sourceX = d.source.x + operatorWidth / 2;
                  targetX = d.target.x + d.source.tx;
                  sourceY = d.source.y + d.source.height;
                  targetY = d.target.y;
                  yi = d3.interpolateNumber(sourceY, targetY);
                  curvature = .5;
                  control1 = yi(curvature);
                  control2 = yi(1 - curvature);
                  controlWidth = Math.min(width / Math.PI, (targetY - sourceY) / Math.PI);
                  if (sourceX > targetX + width / 2) {
                    controlWidth *= -1;
                  }
                  return ['M', sourceX + width / 2, sourceY, 'C', sourceX + width / 2, control1 - controlWidth, targetX + width, control2 - controlWidth, targetX + width, targetY, 'L', targetX, targetY, 'C', targetX, control2 + controlWidth, sourceX - width / 2, control1 + controlWidth, sourceX - width / 2, sourceY, 'Z'].join(' ');
                });
              }
            },
            'text': {
              data: function(d) {
                var caption, key, source, x, y, _ref;
                x = d.source.x + operatorWidth / 2;
                y = d.source.y + d.source.height + operatorDetailHeight;
                source = d.source;
                _ref = source.Rows != null ? ['Rows', 'row'] : ['EstimatedRows', 'estimated row'], key = _ref[0], caption = _ref[1];
                return [
                  {
                    x: x,
                    y: y,
                    text: formatNumber(source[key]) + ' ',
                    anchor: 'end'
                  }, {
                    x: x,
                    y: y,
                    text: plural(caption, source[key]),
                    anchor: 'start'
                  }
                ];
              },
              selections: function(enter, update) {
                enter.append('text').attr('font-size', detailFontSize).attr('font-family', standardFont);
                return update.transition().attr('x', function(d) {
                  return d.x;
                }).attr('y', function(d) {
                  return d.y;
                }).attr('text-anchor', function(d) {
                  return d.anchor;
                }).attr('xml:space', 'preserve').text(function(d) {
                  return d.text;
                });
              }
            }
          }
        },
        '.operator': {
          data: operators,
          selections: function(enter, update) {
            enter.append('g').attr('class', 'operator');
            return update.transition().attr('transform', function(d) {
              return "translate(" + d.x + "," + d.y + ")";
            });
          },
          children: {
            'g.header': {
              data: function(d) {
                return [d];
              },
              selections: function(enter) {
                return enter.append('g').attr('class', 'header').attr('pointer-events', 'all').on('click', function(d) {
                  d.expanded = !d.expanded;
                  return redisplay();
                });
              },
              children: {
                'path.banner': {
                  data: function(d) {
                    return [d];
                  },
                  selections: function(enter, update) {
                    enter.append('path').attr('class', 'banner');
                    return update.attr('d', function(d) {
                      var shaving;
                      shaving = d.height <= operatorHeaderHeight ? operatorCornerRadius : d.height < operatorHeaderHeight + operatorCornerRadius ? operatorCornerRadius - Math.sqrt(Math.pow(operatorCornerRadius, 2) - Math.pow(operatorCornerRadius - d.height + operatorHeaderHeight, 2)) : 0;
                      return ['M', operatorWidth - operatorCornerRadius, 0, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, operatorWidth, operatorCornerRadius, 'L', operatorWidth, operatorHeaderHeight - operatorCornerRadius, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, operatorWidth - shaving, operatorHeaderHeight, 'L', shaving, operatorHeaderHeight, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, 0, operatorHeaderHeight - operatorCornerRadius, 'L', 0, operatorCornerRadius, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, operatorCornerRadius, 0, 'Z'].join(' ');
                    }).style('fill', function(d) {
                      return color(d.operatorType).color;
                    });
                  }
                },
                'path.expand': {
                  data: function(d) {
                    if (d.operatorType === 'Result') {
                      return [];
                    } else {
                      return [d];
                    }
                  },
                  selections: function(enter, update) {
                    var rotateForExpand;
                    rotateForExpand = function(d) {
                      return ("translate(" + (operatorHeaderHeight / 2) + ", " + (operatorHeaderHeight / 2) + ") ") + ("rotate(" + (d.expanded ? 90 : 0) + ") ") + "scale(0.5)";
                    };
                    enter.append('path').attr('class', 'expand').attr('fill', function(d) {
                      return color(d.operatorType)['text-color-internal'];
                    }).attr('d', 'M -5 -10 L 8.66 0 L -5 10 Z').attr('transform', rotateForExpand);
                    return update.transition().attr('transform', rotateForExpand);
                  }
                },
                'text.title': {
                  data: function(d) {
                    return [d];
                  },
                  selections: function(enter) {
                    return enter.append('text').attr('class', 'title').attr('font-size', operatorHeaderFontSize).attr('font-family', standardFont).attr('x', operatorHeaderHeight).attr('y', 13).attr('fill', function(d) {
                      return color(d.operatorType)['text-color-internal'];
                    }).text(function(d) {
                      return d.operatorType;
                    });
                  }
                }
              }
            },
            'rect.outline': {
              data: function(d) {
                return [d];
              },
              selections: function(enter, update) {
                enter.append('rect').attr('class', 'outline');
                return update.transition().attr('width', operatorWidth).attr('height', function(d) {
                  return d.height;
                }).attr('rx', operatorCornerRadius).attr('ry', operatorCornerRadius).attr('fill', 'none').attr('stroke-width', 1).style('stroke', function(d) {
                  return color(d.operatorType)['border-color'];
                });
              }
            },
            'g.detail': {
              data: operatorDetails,
              selections: function(enter, update, exit) {
                enter.append('g');
                update.attr('class', function(d) {
                  return 'detail ' + d.className;
                }).attr('transform', function(d) {
                  return "translate(0, " + (operatorHeaderHeight + d.y) + ")";
                }).attr('font-family', function(d) {
                  if (d.className === 'expression' || d.className === 'identifiers') {
                    return fixedWidthFont;
                  } else {
                    return standardFont;
                  }
                });
                return exit.remove();
              },
              children: {
                'text': {
                  data: function(d) {
                    if (d.key) {
                      return [
                        {
                          text: d.value + ' ',
                          anchor: 'end',
                          x: operatorWidth / 2
                        }, {
                          text: d.key,
                          anchor: 'start',
                          x: operatorWidth / 2
                        }
                      ];
                    } else {
                      return [
                        {
                          text: d.value,
                          anchor: 'start',
                          x: operatorPadding
                        }
                      ];
                    }
                  },
                  selections: function(enter, update, exit) {
                    enter.append('text').attr('font-size', detailFontSize);
                    update.attr('x', function(d) {
                      return d.x;
                    }).attr('text-anchor', function(d) {
                      return d.anchor;
                    }).attr('xml:space', 'preserve').attr('fill', 'black').transition().each('end', function() {
                      return update.text(function(d) {
                        return d.text;
                      });
                    });
                    return exit.remove();
                  }
                },
                'path.divider': {
                  data: function(d) {
                    if (d.className === 'padding') {
                      return [d];
                    } else {
                      return [];
                    }
                  },
                  selections: function(enter, update) {
                    enter.append('path').attr('class', 'divider').attr('visibility', 'hidden');
                    return update.attr('d', ['M', 0, -operatorPadding * 2, 'L', operatorWidth, -operatorPadding * 2].join(' ')).attr('stroke', '#DFE1E3').transition().each('end', function() {
                      return update.attr('visibility', 'visible');
                    });
                  }
                }
              }
            },
            'path.cost': {
              data: function(d) {
                return [d];
              },
              selections: function(enter, update) {
                enter.append('path').attr('class', 'cost').attr('fill', costColor);
                return update.transition().attr('d', function(d) {
                  var shaving;
                  if (d.costHeight < operatorCornerRadius) {
                    shaving = operatorCornerRadius - Math.sqrt(Math.pow(operatorCornerRadius, 2) - Math.pow(operatorCornerRadius - d.costHeight, 2));
                    return ['M', operatorWidth - shaving, d.height - d.costHeight, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, operatorWidth - operatorCornerRadius, d.height, 'L', operatorCornerRadius, d.height, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, shaving, d.height - d.costHeight, 'Z'].join(' ');
                  } else {
                    return ['M', 0, d.height - d.costHeight, 'L', operatorWidth, d.height - d.costHeight, 'L', operatorWidth, d.height - operatorCornerRadius, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, operatorWidth - operatorCornerRadius, d.height, 'L', operatorCornerRadius, d.height, 'A', operatorCornerRadius, operatorCornerRadius, 0, 0, 1, 0, d.height - operatorCornerRadius, 'Z'].join(' ');
                  }
                });
              }
            },
            'text.cost': {
              data: function(d) {
                var y;
                if (d.alwaysShowCost) {
                  y = d.height - d.costHeight + operatorDetailHeight;
                  return [
                    {
                      text: formatNumber(d.DbHits) + ' ',
                      anchor: 'end',
                      y: y
                    }, {
                      text: 'db hits',
                      anchor: 'start',
                      y: y
                    }
                  ];
                } else {
                  return [];
                }
              },
              selections: function(enter, update) {
                enter.append('text').attr('class', 'cost').attr('font-size', detailFontSize).attr('font-family', standardFont).attr('fill', 'white');
                return update.attr('x', operatorWidth / 2).attr('text-anchor', function(d) {
                  return d.anchor;
                }).attr('xml:space', 'preserve').transition().attr('y', function(d) {
                  return d.y;
                }).each('end', function() {
                  return update.text(function(d) {
                    return d.text;
                  });
                });
              }
            }
          }
        }
      });
    };
    display = function(queryPlan) {
      var height, links, operators, width, _ref, _ref1;
      _ref = transform(queryPlan), operators = _ref[0], links = _ref[1];
      _ref1 = layout(operators, links), width = _ref1[0], height = _ref1[1];
      return render(operators, links, width, height, function() {
        return display(queryPlan);
      });
    };
    this.display = display;
    return this;
  };

}).call(this);
