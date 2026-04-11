[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / KeyPressHandler

# Type Alias: KeyPressHandler

> **KeyPressHandler** = (`key`) => `boolean` \| `void`

Defined in: [types/src/index.ts:101](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L101)

Props shared by all container nodes ([ContainerNode](../interfaces/ContainerNode.md) and [TextInputNode](../interfaces/TextInputNode.md)).

Controls layout, sizing, scrolling, focus, click handling, key events,
and styling. Style props on containers are inherited by descendants —
child nodes use the nearest ancestor's values unless they set their own.
Container `bgColor` fills the container rect before painting children.

## Parameters

### key

`string`

## Returns

`boolean` \| `void`
